import {
  DEFAULT_CHUNK_SIZE,
  CHANNEL_WAIT_TIMEOUT_MS,
  INITIAL_ACK_TIMEOUT_MS,
  createFileId,
  createTransferId,
  normalizeChunkSize,
} from './helpers'

export class FileSender {
  constructor(service) {
    this.service = service
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
    const { peers, fileAckBytes, pendingAckResolvers } = this.service
    const state = peers.get(peerId)
    if (!state) {
      throw new Error('Peer connection not found')
    }

    if (!state.channel || state.channel.readyState !== 'open') {
      onStatus?.('Waiting for data channel...')
      await this.waitForOpenDataChannel(peerId, CHANNEL_WAIT_TIMEOUT_MS)
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

    fileAckBytes.clear()
    pendingAckResolvers.clear()

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

      const resumeFrom = await this.waitForFileAck(fileId, INITIAL_ACK_TIMEOUT_MS)
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

  waitForFileAck(fileId, timeoutMs) {
    const { fileAckBytes, pendingAckResolvers } = this.service
    const known = fileAckBytes.get(fileId)
    if (Number.isFinite(known)) {
      return Promise.resolve(known)
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        pendingAckResolvers.delete(fileId)
        resolve(0)
      }, timeoutMs)

      pendingAckResolvers.set(fileId, (value) => {
        clearTimeout(timeoutId)
        pendingAckResolvers.delete(fileId)
        resolve(value)
      })
    })
  }

  waitForOpenDataChannel(peerId, timeoutMs) {
    const { peers } = this.service
    const state = peers.get(peerId)
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
}
