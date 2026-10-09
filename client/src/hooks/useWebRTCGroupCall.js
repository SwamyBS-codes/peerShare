import { useRef, useState, useEffect } from 'react'

export function useWebRTCGroupCall({ wsRef, toast, iceServers, currentUser }) {
  const [activeGroupCall, setActiveGroupCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remotePeers, setRemotePeers] = useState([])
  const [micMuted, setMicMuted] = useState(false)

  const activeGroupCallRef = useRef(null)
  const localStreamRef = useRef(null)
  const peerMapRef = useRef(new Map())

  useEffect(() => {
    activeGroupCallRef.current = activeGroupCall
  }, [activeGroupCall])

  const syncRemotePeers = () => {
    const list = []
    peerMapRef.current.forEach((entry, userId) => {
      if (entry.remoteStream) {
        list.push({ userId, stream: entry.remoteStream })
      }
    })
    setRemotePeers(list)
  }

  const getMedia = async (callMode) => {
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    if (callMode === 'audio') {
      return navigator.mediaDevices.getUserMedia({ audio, video: false })
    }
    return navigator.mediaDevices.getUserMedia({
      audio,
      video: { facingMode: { ideal: 'user' } },
    })
  }

  const sendGroupSignal = (targetUserId, groupId, data) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(
      JSON.stringify({
        type: 'group-signal',
        targetUserId: targetUserId.toLowerCase(),
        groupId,
        data,
      }),
    )
  }

  const cleanupGroupCall = () => {
    peerMapRef.current.forEach((entry) => {
      entry.pc?.close()
    })
    peerMapRef.current.clear()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setRemotePeers([])
    setActiveGroupCall(null)
    setMicMuted(false)
    toast.dismiss('group-call')
  }

  const endGroupCall = () => {
    const call = activeGroupCallRef.current
    if (call && wsRef.current?.readyState === WebSocket.OPEN) {
      call.members
        .map((m) => m.userId)
        .filter((h) => h.toLowerCase() !== currentUser?.userId?.toLowerCase())
        .forEach((handle) => {
          sendGroupSignal(handle, call.groupId, { endCall: true })
        })
    }
    cleanupGroupCall()
    toast.success('Group call ended.')
  }

  const createPeerConnection = (remoteUserId, groupId, isHost) => {
    const pc = new RTCPeerConnection(iceServers)
    const local = localStreamRef.current
    if (local) {
      local.getTracks().forEach((track) => pc.addTrack(track, local))
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendGroupSignal(remoteUserId, groupId, { candidate: event.candidate })
      }
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams
      const entry = peerMapRef.current.get(remoteUserId.toLowerCase()) || { pc }
      entry.remoteStream = stream
      peerMapRef.current.set(remoteUserId.toLowerCase(), entry)
      syncRemotePeers()
    }

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        peerMapRef.current.delete(remoteUserId.toLowerCase())
        syncRemotePeers()
      }
    }

    peerMapRef.current.set(remoteUserId.toLowerCase(), { pc, isHost })
    return pc
  }

  const startGroupCall = async (group, callMode = 'video') => {
    if (!group?.members?.length) {
      toast.error('Group has no members.')
      return
    }

    const others = group.members.filter(
      (m) => m.userId.toLowerCase() !== currentUser?.userId?.toLowerCase(),
    )
    if (!others.length) {
      toast.error('Add more members to start a group call.')
      return
    }

    try {
      const stream = await getMedia(callMode)
      localStreamRef.current = stream
      setLocalStream(stream)
    } catch (err) {
      console.error(err)
      toast.error('Microphone/camera access denied.')
      return
    }

    const callState = {
      groupId: group.id,
      groupName: group.name,
      role: 'host',
      callMode,
      members: group.members,
      hostUserId: currentUser?.userId,
    }
    setActiveGroupCall(callState)
    toast.loading('Starting group call…', { id: 'group-call' })

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'group-call-invite',
          targets: others.map((m) => m.userId.toLowerCase()),
          groupId: group.id,
          groupName: group.name,
          mediaType: callMode,
          members: group.members.map((m) => m.userId),
        }),
      )
    }
    toast.success('Invites sent to group.', { id: 'group-call' })
  }

  const acceptGroupCall = async (invite) => {
    try {
      const stream = await getMedia(invite.mediaType || 'video')
      localStreamRef.current = stream
      setLocalStream(stream)
    } catch (err) {
      toast.error('Could not access microphone/camera.')
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'group-call-response',
            targetUserId: invite.hostUserId.toLowerCase(),
            groupId: invite.groupId,
            accepted: false,
          }),
        )
      }
      return
    }

    setActiveGroupCall({
      groupId: invite.groupId,
      groupName: invite.groupName,
      role: 'guest',
      callMode: invite.mediaType || 'video',
      members: (invite.members || []).map((userId) => ({ userId })),
      hostUserId: invite.hostUserId,
    })

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'group-call-response',
          targetUserId: invite.hostUserId.toLowerCase(),
          groupId: invite.groupId,
          accepted: true,
        }),
      )
    }
    toast.success('Joined group call.')
  }

  const declineGroupCall = (invite) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'group-call-response',
          targetUserId: invite.hostUserId.toLowerCase(),
          groupId: invite.groupId,
          accepted: false,
        }),
      )
    }
  }

  const hostConnectToGuest = async (guestUserId, groupId) => {
    const key = guestUserId.toLowerCase()
    if (peerMapRef.current.has(key)) return

    const pc = createPeerConnection(guestUserId, groupId, true)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    sendGroupSignal(guestUserId, groupId, { sdp: offer })
  }

  const handleGroupSignaling = async (fromUserId, groupId, data) => {
    const call = activeGroupCallRef.current
    if (!call || call.groupId !== groupId) return

    if (data.endCall) {
      peerMapRef.current.delete(fromUserId.toLowerCase())
      syncRemotePeers()
      if (call.role === 'guest' && fromUserId.toLowerCase() === call.hostUserId?.toLowerCase()) {
        cleanupGroupCall()
        toast('Host ended the group call.', { icon: '📞' })
      }
      return
    }

    if (data.sdp) {
      const key = fromUserId.toLowerCase()
      let entry = peerMapRef.current.get(key)

      if (data.sdp.type === 'offer') {
        if (!entry) {
          const pc = createPeerConnection(fromUserId, groupId, false)
          entry = peerMapRef.current.get(key)
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          sendGroupSignal(fromUserId, groupId, { sdp: answer })
        }
      } else if (data.sdp.type === 'answer' && entry?.pc) {
        await entry.pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      }
    } else if (data.candidate) {
      const entry = peerMapRef.current.get(fromUserId.toLowerCase())
      const candidate = new RTCIceCandidate(data.candidate)
      if (entry?.pc?.remoteDescription) {
        await entry.pc.addIceCandidate(candidate)
      }
    }
  }

  const handleGroupCallResponse = async (fromUserId, groupId, accepted) => {
    const call = activeGroupCallRef.current
    if (!call || call.role !== 'host' || call.groupId !== groupId) return
    if (!accepted) {
      toast.error(`@${fromUserId} declined the group call.`)
      return
    }
    await hostConnectToGuest(fromUserId, groupId)
  }

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setMicMuted((v) => !v)
    }
  }

  return {
    activeGroupCall,
    localStream,
    remotePeers,
    micMuted,
    startGroupCall,
    acceptGroupCall,
    declineGroupCall,
    endGroupCall,
    handleGroupSignaling,
    handleGroupCallResponse,
    cleanupGroupCall,
  }
}
