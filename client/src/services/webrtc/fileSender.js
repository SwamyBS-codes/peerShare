import {
  DEFAULT_CHUNK_SIZE,
  CHANNEL_WAIT_TIMEOUT_MS,
  INITIAL_ACK_TIMEOUT_MS,
  createFileId,
  createTransferId,
  normalizeChunkSize
} from './helpers'

export class FileSender {
  constructor(service) {
    this.service = service
    this.worker = null
    this.isSending = false
    this.activeTransferId = null
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
    onBenchmarkComplete
  ) {
    const { peers } = this.service
    const state = peers.get(peerId)
    if (!state) {
      throw new Error('Peer connection not found')
    }

    // Get all control and data channels
    const finalControlCh = state.controlChannel || state.channel
    const dataChannels = state.dataChannels || [state.channel]

    if (!finalControlCh || finalControlCh.readyState !== 'open') {
      onStatus?.('Waiting for data channel...')
      await this.waitForOpenDataChannel(peerId, CHANNEL_WAIT_TIMEOUT_MS)
    }

    const controlCh = state.controlChannel || state.channel
    if (!controlCh || controlCh.readyState !== 'open') {
      throw new Error('Control channel is not available. Please reconnect.')
    }

    this.isSending = true
    const transferId = createTransferId(files)
    this.activeTransferId = transferId
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
    
    let sentBytes = 0
    let lastTick = performance.now()
    let lastProgressTick = 0
    
    // Performance Benchmark stats
    const benchmark = {
      startTime: Date.now(),
      endTime: 0,
      totalBytes,
      sentBytes: 0,
      peakSpeed: 0,
      averageSpeed: 0,
      retransmissions: 0,
      activeChannels: 1,
      hashingTimeMs: 0,
      receiverDiskWriteMs: 0,
      rttMs: 0,
      completionCode: 'success' // 'success' | 'cancelled' | 'error'
    }

    // Network & Adaptive channel state
    let activeChannelCount = 1
    let ewmaRTT = 50 // ms default
    let rttCount = 0
    let lastThroughput = 0
    let channelEvaluationTimer = null
    let rttPingIntervalId = null
    let originalOnData = null

    // Configure watermarks per data channel
    const chunkSize = normalizeChunkSize(chunkSizeBytes)
    const lowWatermark = Math.max(chunkSize * 4, 256 * 1024) // 256 KB
    const highWatermark = Math.max(chunkSize * 16, 1024 * 1024) // 1 MB

    // Queue mitigation: Catch RTCDataChannel send queue overflows locally
    const pendingOutgoingQueues = dataChannels.map(() => [])

    const getBestDataChannel = () => {
      let best = dataChannels[0]
      const count = Math.min(activeChannelCount, dataChannels.length)
      for (let i = 1; i < count; i++) {
        if (dataChannels[i].bufferedAmount < best.bufferedAmount) {
          best = dataChannels[i]
        }
      }
      return best
    }

    // Set bufferedAmountLowThreshold and event handlers
    dataChannels.forEach((ch, idx) => {
      ch.bufferedAmountLowThreshold = lowWatermark
      ch.onbufferedamountlow = () => {
        flushQueueAndRequest(idx)
      }
    })

    const sendOrQueueProduct = (channelIdx, buffer, length, isRetransmit) => {
      const ch = dataChannels[channelIdx] || getBestDataChannel()
      const chIdx = dataChannels.indexOf(ch)

      if (pendingOutgoingQueues[chIdx].length > 0 || ch.bufferedAmount > highWatermark) {
        pendingOutgoingQueues[chIdx].push({ buffer, length, isRetransmit })
        return false
      }

      try {
        ch.send(buffer)
        if (!isRetransmit) {
          sentBytes += length
        }
        benchmark.sentBytes = sentBytes
        if (isRetransmit) {
          benchmark.retransmissions++
        }
        return true
      } catch {
        // Catch RTCDataChannel queue full and cache locally
        pendingOutgoingQueues[chIdx].push({ buffer, length, isRetransmit })
        return false
      }
    }

    const flushQueueAndRequest = (channelIdx) => {
      const q = pendingOutgoingQueues[channelIdx]
      const ch = dataChannels[channelIdx]

      while (q.length > 0 && ch.bufferedAmount < highWatermark) {
        const item = q[0]
        try {
          ch.send(item.buffer)
          q.shift()
          if (!item.isRetransmit) {
            sentBytes += item.length
          }
          benchmark.sentBytes = sentBytes
          if (item.isRetransmit) {
            benchmark.retransmissions++
          }
        } catch {
          break // queue is still full
        }
      }

      // If all queues are relatively clear, request more chunks from the worker
      const totalPending = pendingOutgoingQueues.reduce((sum, queue) => sum + queue.length, 0)
      if (totalPending < 16 && this.worker) {
        this.worker.postMessage({ type: 'request-chunks' })
      }
    }

    // Clean up current transfer state on finish
    const cleanup = () => {
      this.isSending = false
      if (rttPingIntervalId) clearInterval(rttPingIntervalId)
      if (channelEvaluationTimer) clearInterval(channelEvaluationTimer)
      if (this.worker) {
        this.worker.terminate()
        this.worker = null
      }
      dataChannels.forEach(ch => {
        ch.onbufferedamountlow = null
      })
      if (originalOnData) {
        this.service.handlers.onData = originalOnData
      }
    }

    return new Promise((resolve) => {
      // Initialize worker via Vite URL
      this.worker = new Worker(new URL('./transferWorker.js', import.meta.url), { type: 'module' })

      // Handle control messages from receiver
      originalOnData = this.service.handlers?.onData
      this.service.handlers.onData = (pid, data) => {
        if (typeof data === 'string') {
          try {
            const payload = JSON.parse(data)
            
            if (payload.type === 'rtt-pong') {
              const rtt = Date.now() - payload.timestamp
              ewmaRTT = rttCount === 0 ? rtt : 0.8 * ewmaRTT + 0.2 * rtt
              rttCount++
              benchmark.rttMs = Math.round(ewmaRTT)

              // Update channel statistics in transferWorker
              if (this.worker) {
                const stats = dataChannels.map((ch, idx) => ({
                  index: idx,
                  bufferedAmount: ch.bufferedAmount,
                  growthSpeed: pendingOutgoingQueues[idx].length,
                  isStalled: ch.readyState !== 'open'
                }))
                this.worker.postMessage({ type: 'update-channel-stats', payload: stats })
              }
            } else if (payload.type === 'nack-block') {
              // Receiver requests block retransmission on verification error
              if (this.worker) {
                this.worker.postMessage({
                  type: 'nack-blocks',
                  payload: { fileIndex: payload.fileIndex, blockIndex: payload.blockIndex }
                })
              }
            } else if (payload.type === 'receiver-benchmark-report') {
              benchmark.receiverDiskWriteMs = payload.diskWriteMs
              benchmark.hashingTimeMs = payload.hashingTimeMs
            }
          } catch {
            // Ignore
          }
        }
        originalOnData?.(pid, data)
      }

      // RTT Ping Loop over control channel
      rttPingIntervalId = setInterval(() => {
        if (!this.isSending) return
        try {
          controlCh.send(JSON.stringify({ type: 'rtt-ping', timestamp: Date.now() }))
        } catch {
          // ignore transient send failures
        }
      }, 1000)

      // Active Channel Scaling evaluation
      channelEvaluationTimer = setInterval(() => {
        if (!this.isSending) return
        
        const now = performance.now()
        const currentThroughput = sentBytes / ((now - benchmark.startTime) / 1000)

        // Evaluate channel count
        if (lastThroughput > 0 && dataChannels.length > 1) {
          if (currentThroughput > lastThroughput * 1.05 && activeChannelCount < dataChannels.length) {
            // Adding a channel helped, scale up
            activeChannelCount++
          } else if (currentThroughput < lastThroughput * 0.90 && activeChannelCount > 1) {
            // RTT or congestion occurred, scale down
            activeChannelCount--
          }
        }
        
        lastThroughput = currentThroughput
        benchmark.activeChannels = activeChannelCount
        
        if (this.worker) {
          this.worker.postMessage({ type: 'update-active-count', payload: { activeCount: activeChannelCount } })
        }
      }, 2000)

      // Initialize the transfer worker
      this.worker.postMessage({
        type: 'init',
        payload: {
          files,
          transferId,
          chunkSize,
          activeCount: activeChannelCount
        }
      })

      // Worker message router
      this.worker.onmessage = async (e) => {
        const { type, payload } = e.data

        if (type === 'block-hashes') {
          // Forward block-hashes to receiver
          controlCh.send(JSON.stringify({
            type: 'file-block-hashes',
            transferId,
            fileIndex: payload.fileIndex,
            hashes: payload.hashes
          }))
        } else if (type === 'chunk') {
          if (shouldCancel?.()) {
            benchmark.completionCode = 'cancelled'
            controlCh.send(JSON.stringify({ type: 'transfer-cancelled' }))
            cleanup()
            onStatus?.('Transfer cancelled')
            resolve()
            return
          }

          const sent = sendOrQueueProduct(payload.targetChannelIndex, payload.packet, payload.length, payload.isRetransmit)
          if (sent) {
            // If sent successfully, request another chunk
            this.worker.postMessage({ type: 'request-chunks' })
          }

          // Throttle speeds/progress callbacks to prevent main thread rendering lockups
          const now = performance.now()
          const elapsed = (now - lastTick) / 1000
          if (elapsed >= 0.5) {
            const speed = sentBytes / ((now - benchmark.startTime) / 1000)
            onSpeed?.(speed)
            if (speed > benchmark.peakSpeed) {
              benchmark.peakSpeed = speed
            }
            lastTick = now
          }

          const percent = totalBytes > 0 ? Math.min(100, Math.round((sentBytes / totalBytes) * 100)) : 0
          if (now - lastProgressTick >= 150 || percent === 100) {
            onProgress?.(percent)
            lastProgressTick = now
          }
        } else if (type === 'all-sent') {
          // We finished sending all packets, but must verify they're drained from queues
          const checkDrained = setInterval(() => {
            const totalPending = pendingOutgoingQueues.reduce((sum, q) => sum + q.length, 0)
            const totalBuffered = dataChannels.reduce((sum, ch) => sum + ch.bufferedAmount, 0)

            if (totalPending === 0 && totalBuffered === 0) {
              clearInterval(checkDrained)
              
              benchmark.endTime = Date.now()
              benchmark.averageSpeed = totalBytes / ((benchmark.endTime - benchmark.startTime) / 1000)
              
              controlCh.send(JSON.stringify({
                type: 'transfer-complete',
                transferId,
                benchmark
              }))

              onProgress?.(100)
              onStatus?.('Transfer complete')
              onBenchmarkComplete?.(benchmark)
              cleanup()
              resolve()
            }
          }, 100)
        }
      }

      // Initial negotiate trigger
      controlCh.send(
        JSON.stringify({
          type: 'transfer-start',
          transferId,
          totalFiles: files.length,
          totalBytes,
        })
      )

      onStatus?.('Initializing transfer...')
      
      // Let the files loop negotiate meta-data ack
      ;(async () => {
        for (const [fileIndex, file] of files.entries()) {
          const fileId = createFileId(file, fileIndex)

          if (shouldCancel?.()) {
            controlCh.send(JSON.stringify({ type: 'transfer-cancelled' }))
            cleanup()
            onStatus?.('Transfer cancelled')
            resolve()
            return
          }

          onStatus?.(`Sending ${file.name}...`)
          onFileStatus?.(fileId, 'sending', file)

          controlCh.send(
            JSON.stringify({
              type: 'file-meta',
              id: fileId,
              transferId,
              name: file.name,
              size: file.size,
              mime: file.type,
              resumeAllowed: true,
            })
          )

          const resumeFrom = await this.waitForFileAck(fileId, INITIAL_ACK_TIMEOUT_MS)
          if (resumeFrom > 0) {
            onStatus?.(`Resuming ${file.name} from ${(resumeFrom / 1024 / 1024).toFixed(2)} MB...`)
          }

          sentBytes += resumeFrom
        }

        // Trigger chunk scheduling loop
        if (this.worker) {
          this.worker.postMessage({ type: 'request-chunks' })
        }
      })()
    })
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

    const controlCh = state.controlChannel || state.channel
    if (controlCh && controlCh.readyState === 'open') {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        state.waitingForChannelResolvers = state.waitingForChannelResolvers.filter((entry) => entry.id !== id)
        reject(new Error('Timed out waiting for control channel'))
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
