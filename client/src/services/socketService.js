/** Wraps the signaling WebSocket with message handling and bounded reconnects. */
/** Owns a signaling socket and its retry state for a single peer session. */
export class SocketService {
  constructor({ maxRetries = 3, retryDelayMs = 1500 } = {}) {
    this.maxRetries = maxRetries
    this.retryDelayMs = retryDelayMs
    this.retries = 0
    this.ws = null
    this.config = null
    this.closedManually = false
  }

  /** Saves connection callbacks and starts opening the configured socket. */
  connect(config) {
    this.config = config
    this.closedManually = false
    this.#open()
  }

  /** Opens a socket and binds configured callbacks, retrying after unexpected closes. */
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

  /** Sends a signaling payload when the WebSocket is open. */
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

  /** Closes the socket and disables automatic reconnect attempts. */
  close() {
    this.closedManually = true
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
