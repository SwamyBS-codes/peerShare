export class ConnectionManager {
  constructor(service) {
    this.service = service
  }

  async ensurePeerConnection(peerId, initiator = false) {
    const { peers, iceServers, handlers, dataChannelHandler } = this.service

    if (peers.has(peerId)) {
      return peers.get(peerId).pc
    }

    const pc = new RTCPeerConnection({
      iceServers,
    })

    const state = {
      pc,
      channel: null,
      pendingCandidates: [],
      waitingForChannelResolvers: [],
    }
    peers.set(peerId, state)

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        handlers.onSignal?.(peerId, { candidate: event.candidate })
      }
    }

    pc.onconnectionstatechange = () => {
      const status = pc.connectionState
      handlers.onConnectionState?.(peerId, status)

      if (['failed', 'closed'].includes(status)) {
        this.resolveChannelWaiters(state, new Error('Connection closed before data channel became available'))
        peers.delete(peerId)
      }
    }

    pc.ondatachannel = (event) => {
      const channel = event.channel
      if (channel.label === 'peershare-control') {
        state.controlChannel = channel
        state.channel = channel // for backward compatibility
      } else if (channel.label.startsWith('peershare-data-')) {
        if (!state.dataChannels) state.dataChannels = []
        state.dataChannels.push(channel)
        state.dataChannels.sort((a, b) => a.label.localeCompare(b.label))
      }
      dataChannelHandler.attachDataChannel(peerId, channel)
    }

    if (initiator) {
      const controlCh = pc.createDataChannel('peershare-control', { ordered: true })
      state.controlChannel = controlCh
      state.channel = controlCh // for backward compatibility
      dataChannelHandler.attachDataChannel(peerId, controlCh)

      state.dataChannels = []
      for (let i = 0; i < 4; i++) {
        const dataCh = pc.createDataChannel(`peershare-data-${i}`, { ordered: false })
        state.dataChannels.push(dataCh)
        dataChannelHandler.attachDataChannel(peerId, dataCh)
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      handlers.onSignal?.(peerId, { sdp: pc.localDescription })
    }

    return pc
  }

  async handleSignal(fromPeerId, data) {
    const { peers, handlers } = this.service
    const pc = await this.ensurePeerConnection(fromPeerId, false)
    const state = peers.get(fromPeerId)

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
        handlers.onSignal?.(fromPeerId, { sdp: pc.localDescription })
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

  resolveChannelWaiters(state, error) {
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
}
