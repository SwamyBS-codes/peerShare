export class DataChannelHandler {
  constructor(service) {
    this.service = service
  }

  attachDataChannel(peerId, channel) {
    const { peers, handlers, routeMonitor } = this.service
    const state = peers.get(peerId)
    channel.binaryType = 'arraybuffer'

    channel.onopen = () => {
      handlers.onChannelState?.(peerId, 'open')
      routeMonitor.startRouteMonitor(peerId)
      if (state) {
        this.service.connectionManager.resolveChannelWaiters(state, null)
      }
    }

    channel.onclose = () => {
      handlers.onChannelState?.(peerId, 'closed')
      routeMonitor.stopRouteMonitor(peerId)
      if (state) {
        this.service.connectionManager.resolveChannelWaiters(state, new Error('Data channel closed'))
      }
    }

    channel.onerror = () => {
      handlers.onChannelState?.(peerId, 'error')
      routeMonitor.stopRouteMonitor(peerId)
      if (state) {
        this.service.connectionManager.resolveChannelWaiters(state, new Error('Data channel error'))
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
      }

      handlers.onData?.(peerId, event.data)
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
