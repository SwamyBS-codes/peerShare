export const DEFAULT_CHUNK_SIZE = 64 * 1024
const MIN_CHUNK_SIZE = 4 * 1024
const MAX_CHUNK_SIZE = 1024 * 1024
const INITIAL_ACK_TIMEOUT_MS = 2200
const CHANNEL_WAIT_TIMEOUT_MS = 12000

function createFileId(file, index) {
  return `${index}:${file.name}:${file.size}:${file.lastModified}`
}

function createTransferId(files) {
  const signature = files
    .map((file, index) => createFileId(file, index))
    .join('|')
  return `transfer:${signature}`
}

function normalizeChunkSize(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_CHUNK_SIZE
  }
  return Math.min(Math.max(Math.floor(value), MIN_CHUNK_SIZE), MAX_CHUNK_SIZE)
}

export class WebRTCService {
  constructor(iceServers) {
    this.iceServers = iceServers
    this.peers = new Map()
    this.handlers = {}
    this.fileAckBytes = new Map()
    this.pendingAckResolvers = new Map()
    this.routeTimers = new Map()
  }

  setHandlers(handlers) {
    this.handlers = handlers
  }

  getOpenPeerIds() {
    return [...this.peers.entries()]
      .filter(([, state]) => state.channel && state.channel.readyState === 'open')
      .map(([peerId]) => peerId)
  }

  getKnownPeerIds() {
    return [...this.peers.keys()]
  }

  async ensurePeerConnection(peerId, initiator = false) {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId).pc
    }

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    })

    const state = {
      pc,
      channel: null,
      pendingCandidates: [],
      waitingForChannelResolvers: [],
    }
    this.peers.set(peerId, state)

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.handlers.onSignal?.(peerId, { candidate: event.candidate })
      }
    }

    pc.onconnectionstatechange = () => {
      const status = pc.connectionState
      this.handlers.onConnectionState?.(peerId, status)

      if (['failed', 'closed'].includes(status)) {
        this.#resolveChannelWaiters(state, new Error('Connection closed before data channel became available'))
        this.peers.delete(peerId)
      }
    }

    pc.ondatachannel = (event) => {
      state.channel = event.channel
      this.#attachDataChannel(peerId, state.channel)
    }

    if (initiator) {
      const channel = pc.createDataChannel('peershare', { ordered: true })
      state.channel = channel
      this.#attachDataChannel(peerId, channel)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      this.handlers.onSignal?.(peerId, { sdp: pc.localDescription })
    }

    return pc
  }

  async handleSignal(fromPeerId, data) {
    const pc = await this.ensurePeerConnection(fromPeerId, false)
    const state = this.peers.get(fromPeerId)

    if (data.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))

      if (state?.pendingCandidates?.length) {
        for (const candidate of state.pendingCandidates) {
          try {
            await pc.addIceCandidate(candidate)
          } catch {
            // Ignore invalid pending candidates.
          }
        }
        state.pendingCandidates = []
      }

      if (data.sdp.type === 'offer') {
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        this.handlers.onSignal?.(fromPeerId, { sdp: pc.localDescription })
      }
    }

    if (data.candidate) {
      const candidate = new RTCIceCandidate(data.candidate)
      if (!pc.remoteDescription) {
        state?.pendingCandidates?.push(candidate)
        return
      }

      try {
        await pc.addIceCandidate(candidate)
      } catch {
        // Ignore candidate add errors that can happen during renegotiation races.
      }
    }
  }

  async sendFiles(
    peerId,
    files,
    onProgress,
    onSpeed,
    onStatus,
    shouldCancel,
    chunkSizeBytes = DEFAULT_CHUNK_SIZE,
    onFileStatus,
  ) {
    const state = this.peers.get(peerId)
    if (!state) {
      throw new Error('Peer connection not found')
    }

    if (!state.channel || state.channel.readyState !== 'open') {
      onStatus?.('Waiting for data channel...')
      await this.#waitForOpenDataChannel(peerId, CHANNEL_WAIT_TIMEOUT_MS)
    }

    if (!state.channel || state.channel.readyState !== 'open') {
      throw new Error('Data channel is not available. Please reconnect and try again.')
    }

    const channel = state.channel
    const chunkSize = normalizeChunkSize(chunkSizeBytes)
    const transferId = createTransferId(files)
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
    let sentBytes = 0
    let bytesThisWindow = 0
    let lastTick = performance.now()

    this.fileAckBytes.clear()
    this.pendingAckResolvers.clear()

    channel.send(
      JSON.stringify({
        type: 'transfer-start',
        transferId,
        totalFiles: files.length,
        totalBytes,
      }),
    )

    for (const [fileIndex, file] of files.entries()) {
      const fileId = createFileId(file, fileIndex)

      if (shouldCancel?.()) {
        channel.send(JSON.stringify({ type: 'transfer-cancelled' }))
        onStatus?.('Transfer cancelled')
        return
      }

      onStatus?.(`Sending ${file.name}...`)
      onFileStatus?.(fileId, 'sending', file)
      channel.send(
        JSON.stringify({
          type: 'file-meta',
          id: fileId,
          transferId,
          name: file.name,
          size: file.size,
          mime: file.type,
          resumeAllowed: true,
        }),
      )

      const resumeFrom = await this.#waitForFileAck(fileId, INITIAL_ACK_TIMEOUT_MS)
      let offset = Math.min(Math.max(resumeFrom, 0), file.size)

      if (offset > 0) {
        onStatus?.(`Resuming ${file.name} from ${(offset / 1024 / 1024).toFixed(2)} MB...`)
      }

      sentBytes += offset

      while (offset < file.size) {
        if (shouldCancel?.()) {
          channel.send(JSON.stringify({ type: 'transfer-cancelled' }))
          onStatus?.('Transfer cancelled')
          return
        }

        const chunk = file.slice(offset, offset + chunkSize)
        const buffer = await chunk.arrayBuffer()
        channel.send(buffer)
        offset += buffer.byteLength
        sentBytes += buffer.byteLength
        bytesThisWindow += buffer.byteLength

        while (channel.bufferedAmount > chunkSize * 16) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        const now = performance.now()
        const elapsed = (now - lastTick) / 1000
        if (elapsed >= 0.6) {
          onSpeed?.(bytesThisWindow / elapsed)
          bytesThisWindow = 0
          lastTick = now
        }

        const percent = Math.round((sentBytes / totalBytes) * 100)
        onProgress?.(percent)
      }

      channel.send(JSON.stringify({ type: 'file-end', id: fileId, transferId }))
      onFileStatus?.(fileId, 'sent', file)
    }

    channel.send(JSON.stringify({ type: 'transfer-complete', transferId }))
    onProgress?.(100)
    onStatus?.('Transfer complete')
  }

  sendControl(peerId, payload) {
    const state = this.peers.get(peerId)
    if (!state?.channel || state.channel.readyState !== 'open') {
      return
    }

    state.channel.send(JSON.stringify(payload))
  }

  #waitForFileAck(fileId, timeoutMs) {
    const known = this.fileAckBytes.get(fileId)
    if (Number.isFinite(known)) {
      return Promise.resolve(known)
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.pendingAckResolvers.delete(fileId)
        resolve(0)
      }, timeoutMs)

      this.pendingAckResolvers.set(fileId, (value) => {
        clearTimeout(timeoutId)
        this.pendingAckResolvers.delete(fileId)
        resolve(value)
      })
    })
  }

  #handleInternalControlMessage(payload) {
    if (payload?.type !== 'file-ack') {
      return
    }

    if (!payload.id || !Number.isFinite(payload.receivedBytes)) {
      return
    }

    this.fileAckBytes.set(payload.id, payload.receivedBytes)
    const resolver = this.pendingAckResolvers.get(payload.id)
    resolver?.(payload.receivedBytes)
  }

  #attachDataChannel(peerId, channel) {
    const state = this.peers.get(peerId)
    channel.binaryType = 'arraybuffer'

    channel.onopen = () => {
      this.handlers.onChannelState?.(peerId, 'open')
      this.#startRouteMonitor(peerId)
      if (state) {
        this.#resolveChannelWaiters(state, null)
      }
    }

    channel.onclose = () => {
      this.handlers.onChannelState?.(peerId, 'closed')
      this.#stopRouteMonitor(peerId)
      if (state) {
        this.#resolveChannelWaiters(state, new Error('Data channel closed'))
      }
    }

    channel.onerror = () => {
      this.handlers.onChannelState?.(peerId, 'error')
      this.#stopRouteMonitor(peerId)
      if (state) {
        this.#resolveChannelWaiters(state, new Error('Data channel error'))
      }
    }

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const payload = JSON.parse(event.data)
          this.#handleInternalControlMessage(payload)
        } catch {
          // Ignore malformed control payloads.
        }
      }

      this.handlers.onData?.(peerId, event.data)
    }
  }

  #waitForOpenDataChannel(peerId, timeoutMs) {
    const state = this.peers.get(peerId)
    if (!state) {
      return Promise.reject(new Error('Peer connection not found'))
    }

    if (state.channel && state.channel.readyState === 'open') {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        state.waitingForChannelResolvers = state.waitingForChannelResolvers.filter((entry) => entry.id !== id)
        reject(new Error('Timed out waiting for data channel'))
      }, timeoutMs)

      const id = crypto.randomUUID()
      state.waitingForChannelResolvers.push({
        id,
        resolve: () => {
          clearTimeout(timeoutId)
          resolve()
        },
        reject: (error) => {
          clearTimeout(timeoutId)
          reject(error)
        },
      })
    })
  }

  #resolveChannelWaiters(state, error) {
    if (!state.waitingForChannelResolvers.length) {
      return
    }

    const pending = [...state.waitingForChannelResolvers]
    state.waitingForChannelResolvers = []
    for (const entry of pending) {
      if (error) {
        entry.reject(error)
      } else {
        entry.resolve()
      }
    }
  }

  async #detectRouteType(peerId) {
    const state = this.peers.get(peerId)
    if (!state?.pc) {
      return
    }

    const stats = await state.pc.getStats()
    let selectedPair = null
    let localCandidate = null
    let remoteCandidate = null

    for (const report of stats.values()) {
      if (report.type === 'transport' && report.selectedCandidatePairId) {
        selectedPair = stats.get(report.selectedCandidatePairId)
      }

      if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
        selectedPair = report
      }
    }

    if (!selectedPair) {
      this.handlers.onRouteType?.(peerId, 'unknown')
      return
    }

    if (selectedPair.localCandidateId) {
      localCandidate = stats.get(selectedPair.localCandidateId)
    }
    if (selectedPair.remoteCandidateId) {
      remoteCandidate = stats.get(selectedPair.remoteCandidateId)
    }

    const usesRelay = localCandidate?.candidateType === 'relay' || remoteCandidate?.candidateType === 'relay'
    this.handlers.onRouteType?.(peerId, usesRelay ? 'relay' : 'direct')
  }

  #startRouteMonitor(peerId) {
    this.#stopRouteMonitor(peerId)
    const timerId = setInterval(() => {
      this.#detectRouteType(peerId).catch(() => {
        this.handlers.onRouteType?.(peerId, 'unknown')
      })
    }, 2500)

    this.routeTimers.set(peerId, timerId)
    this.#detectRouteType(peerId).catch(() => {
      this.handlers.onRouteType?.(peerId, 'unknown')
    })
  }

  #stopRouteMonitor(peerId) {
    const timerId = this.routeTimers.get(peerId)
    if (timerId) {
      clearInterval(timerId)
      this.routeTimers.delete(peerId)
    }
  }

  closeAll() {
    for (const { pc, channel } of this.peers.values()) {
      channel?.close()
      pc.close()
    }
    for (const timerId of this.routeTimers.values()) {
      clearInterval(timerId)
    }
    this.routeTimers.clear()
    this.peers.clear()
  }
}
