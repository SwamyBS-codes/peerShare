export class SocketService {
  constructor({ maxRetries = 3, retryDelayMs = 1500 } = {}) {
    this.maxRetries = maxRetries
    this.retryDelayMs = retryDelayMs
    this.retries = 0
    this.ws = null
    this.config = null
    this.closedManually = false
  }

  connect(config) {
    this.config = config
    this.closedManually = false
    this.#open()
  }

  #open() {
    if (!this.config) return

    const {
      signalingUrl,
      roomId,
      peerId,
      role,
      token,
      onOpen,
      onMessage,
      onClose,
      onError,
      onRetry,
      onServerError,
    } = this.config
    const query = new URLSearchParams({
      roomId,
      peerId,
      role: role || 'receiver',
    })

    if (token) {
      query.set('token', token)
    }

    const url = `${signalingUrl}?${query.toString()}`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.retries = 0
      onOpen?.()
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message?.type === 'error') {
          onServerError?.(message)
        }
        onMessage?.(message)
      } catch {
        // Ignore malformed signaling messages.
      }
    }

    this.ws.onerror = () => {
      onError?.()
    }

    this.ws.onclose = (event) => {
      onClose?.(event)

      if (!this.closedManually && this.retries < this.maxRetries) {
        this.retries += 1
        const delay = this.retryDelayMs * this.retries
        onRetry?.({ attempt: this.retries, delay })
        setTimeout(() => this.#open(), delay)
      }
    }
  }

  sendSignal(targetPeerId, data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    this.ws.send(
      JSON.stringify({
        type: 'signal',
        targetPeerId,
        data,
      }),
    )
  }

  close() {
    this.closedManually = true
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
