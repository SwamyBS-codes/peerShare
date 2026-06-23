import { ConnectionManager } from './connectionManager'
import { DataChannelHandler } from './dataChannelHandler'
import { FileSender } from './fileSender'
import { RouteMonitor } from './routeMonitor'
import { DEFAULT_CHUNK_SIZE } from './helpers'

export { DEFAULT_CHUNK_SIZE } from './helpers'

export class WebRTCService {
  constructor(iceServers) {
    this.iceServers = iceServers
    this.peers = new Map()
    this.handlers = {}
    this.fileAckBytes = new Map()
    this.pendingAckResolvers = new Map()
    this.routeTimers = new Map()

    this.connectionManager = new ConnectionManager(this)
    this.dataChannelHandler = new DataChannelHandler(this)
    this.fileSender = new FileSender(this)
    this.routeMonitor = new RouteMonitor(this)
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
    return this.connectionManager.ensurePeerConnection(peerId, initiator)
  }

  async handleSignal(fromPeerId, data) {
    return this.connectionManager.handleSignal(fromPeerId, data)
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
    return this.fileSender.sendFiles(
      peerId,
      files,
      onProgress,
      onSpeed,
      onStatus,
      shouldCancel,
      chunkSizeBytes,
      onFileStatus,
    )
  }

  sendControl(peerId, payload) {
    const state = this.peers.get(peerId)
    if (!state?.channel || state.channel.readyState !== 'open') {
      return
    }

    state.channel.send(JSON.stringify(payload))
  }

  closeAll() {
    this.routeMonitor.stopAllRouteMonitors()
    for (const { pc, channel } of this.peers.values()) {
      channel?.close()
      pc.close()
    }
    this.peers.clear()
  }
}
