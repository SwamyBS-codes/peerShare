export class DataChannelHandler {
  constructor(service) {
    this.service = service
  }

  attachDataChannel(peerId, channel) {
    const { peers, handlers, routeMonitor } = this.service
    const state = peers.get(peerId)
    channel.binaryType = 'arraybuffer'

    channel.onopen = () => {
      // Only report open state for the main control channel to prevent duplicate states
      if (channel.label === 'peershare-control') {
        handlers.onChannelState?.(peerId, 'open')
        routeMonitor.startRouteMonitor(peerId)
        if (state) {
          this.service.connectionManager.resolveChannelWaiters(state, null)
        }
      }
    }

    channel.onclose = () => {
      if (channel.label === 'peershare-control') {
        handlers.onChannelState?.(peerId, 'closed')
        routeMonitor.stopRouteMonitor(peerId)
        if (state) {
          this.service.connectionManager.resolveChannelWaiters(state, new Error('Data channel closed'))
        }
      }
    }

    channel.onerror = () => {
      if (channel.label === 'peershare-control') {
        handlers.onChannelState?.(peerId, 'error')
        routeMonitor.stopRouteMonitor(peerId)
        if (state) {
          this.service.connectionManager.resolveChannelWaiters(state, new Error('Data channel error'))
        }
      }
    }

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const payload = JSON.parse(event.data)
          this.handleInternalControlMessage(payload)
        } catch {
          // Ignore malformed control payloads.
        }
        handlers.onData?.(peerId, event.data)
      } else if (event.data instanceof ArrayBuffer) {
        const data = event.data
        if (data.byteLength >= 34) {
          const view = new DataView(data)
          const magic = view.getUint32(0, true)
          const version = view.getUint8(4)
          
          if (magic === 0x50534254 && version === 1) {
            const flags = view.getUint8(5)
            const transferIdHash = view.getBigUint64(8, true).toString(16).padStart(16, '0')
            const fileIdIndex = view.getUint16(16, true)
            const chunkIndex = view.getUint32(18, true)
            const length = view.getUint32(22, true)
            const offset = Number(view.getBigUint64(26, true))

            if (handlers.onBinaryFrame) {
              handlers.onBinaryFrame(peerId, {
                magic,
                version,
                flags,
                transferIdHash,
                fileIdIndex,
                chunkIndex,
                length,
                offset,
                payload: data.slice(34)
              })
              return
            }
          }
        }
        
        // Fallback for raw data if onBinaryFrame is not implemented
        handlers.onData?.(peerId, event.data)
      }
    }
  }

  handleInternalControlMessage(payload) {
    const { fileAckBytes, pendingAckResolvers } = this.service

    if (payload?.type !== 'file-ack') {
      return
    }

    if (!payload.id || !Number.isFinite(payload.receivedBytes)) {
      return
    }

    fileAckBytes.set(payload.id, payload.receivedBytes)
    const resolver = pendingAckResolvers.get(payload.id)
    resolver?.(payload.receivedBytes)
  }
}
