import { useEffect, useState, useRef } from 'react'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'

// Helper component for Brand Icons to avoid external deps
function MessageCircleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379L10.3 19.72a.75.75 0 0 0 1.075-.022l2.185-2.295c.594-.017 1.184-.043 1.77-.078 1.58-.092 2.707-1.488 2.707-3.087V5.11c0-1.6-1.127-2.994-2.707-3.227A48.567 48.567 0 0 0 12 1.5c-3.167 0-6.187.324-9.108.948-1.58.233-2.707 1.627-2.707 3.227V13.5ZM21 16.5a2.25 2.25 0 0 0 2.25-2.25V5.25m0 0a2.25 2.25 0 0 0-2.25-2.25m0 2.25v9a2.25 2.25 0 0 1-2.25 2.25H18" />
    </svg>
  )
}

function VideoIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function PhoneIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.122-4.1-6.924-6.924l1.293-.97a1.242 1.242 0 0 0 .417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  )
}

function PlusIcon({ className = 'h-4 w-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function MoreVerticalIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  )
}

function ArrowLeftIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

export default function ChatHub() {
  const [currentUser] = useState(() => authService.getCurrentUser())
  
  // State variables
  const [friends, setFriends] = useState([])
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [searchUserId, setSearchUserId] = useState('')
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  
  // Responsive / Mobile view management
  const [mobileView, setMobileView] = useState('sidebar') // 'sidebar' | 'chat'

  // Call / WebRTC State
  const [incomingInvite, setIncomingInvite] = useState(null)
  const [activeCall, setActiveCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [micMuted, setMicMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [videoFullScreen, setVideoFullScreen] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)

  // File Transfer State
  const [selectedFile, setSelectedFile] = useState(null)
  const [transferProgress, setTransferProgress] = useState(0)
  const [transferSpeed, setTransferSpeed] = useState(0)
  const [transferState, setTransferState] = useState(null) // null | 'connecting' | 'sending' | 'receiving' | 'completed' | 'failed'
  const [transferFileName, setTransferFileName] = useState('')
  const [transferFileSize, setTransferFileSize] = useState(0)
  const [transferFileNote, setTransferFileNote] = useState('')

  // Refs for WebSockets and Peer Connections
  const wsRef = useRef(null)
  const pcRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const callStartTimeRef = useRef(null)
  const chatEndRef = useRef(null)
  const addContactInputRef = useRef(null)
  const messageFeedRef = useRef(null)

  // Refs for WebRTC File Transfer
  const fileInputRef = useRef(null)
  const filePcRef = useRef(null)
  const fileChannelRef = useRef(null)
  const fileChunksRef = useRef([])
  const receivedBytesRef = useRef(0)
  const fileReaderRef = useRef(null)
  const fileTransferCancelledRef = useRef(false)
  const currentFileRef = useRef(null)
  const fileNoteRef = useRef('')
  const fileInviteIdRef = useRef(null)
  const receiverInviteIdRef = useRef(null)
  const selectedFriendRef = useRef(null)
  const friendsRef = useRef([])

  // Pending ICE candidates queues to prevent WebRTC races
  const videoPendingCandidatesRef = useRef([])
  const filePendingCandidatesRef = useRef([])

  // ICE Servers config
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  // Fetch Friends List & Load Online status
  const fetchFriends = async () => {
    try {
      const res = await authService.fetchAuth('/api/friends')
      const data = await res.json()
      if (data.ok) {
        setFriends(data.friends)
        
        // Query WS for online status once WS is connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const friendNames = data.friends
            .filter(f => f.status === 'accepted')
            .map(f => f.friendUserId)
          if (friendNames.length > 0) {
            wsRef.current.send(JSON.stringify({
              type: 'check-status',
              friends: friendNames
            }))
          }
        }
      }
    } catch (err) {
      console.error('Error fetching friends:', err)
    }
  }

  // Keep friendsRef in sync
  useEffect(() => {
    friendsRef.current = friends
  }, [friends])

  useEffect(() => {
    fetchFriends()
  }, [])

  // Fetch Chat History
  const fetchChatHistory = async (friendId) => {
    try {
      const res = await authService.fetchAuth(`/api/activities?friendId=${friendId}`)
      const data = await res.json()
      if (data.ok) {
        setMessages(data.logs)
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
    }
  }

  useEffect(() => {
    selectedFriendRef.current = selectedFriend
    if (selectedFriend) {
      fetchChatHistory(selectedFriend.friendId)
    } else {
      setMessages([])
    }
  }, [selectedFriend])

  // Scroll to bottom of chat
  useEffect(() => {
    if (messageFeedRef.current) {
      messageFeedRef.current.scrollTop = messageFeedRef.current.scrollHeight
    }
  }, [messages])

  // Reset window scroll when switching chats
  useEffect(() => {
    if (selectedFriend) {
      window.scrollTo(0, 0)
    }
  }, [selectedFriend])

  // Connect to WebSocket Signaling Server
  useEffect(() => {
    let wsUrl = '';
    if (import.meta.env.VITE_API_URL) {
      try {
        const urlObj = new URL(import.meta.env.VITE_API_URL);
        const wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${wsProtocol}//${urlObj.host}?token=${authService.getToken()}`;
      } catch (e) {
        console.error("Invalid VITE_API_URL", e);
      }
    }
    
    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const isDev = window.location.port === '5173' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const signalingHost = isDev ? `${window.location.hostname}:3001` : window.location.host
      wsUrl = `${protocol}//${signalingHost}?token=${authService.getToken()}`
    }

    const socket = new WebSocket(wsUrl)
    wsRef.current = socket

    socket.onopen = () => {
      console.log('[WS] Connected to signaling server.')
      const friendNames = friendsRef.current
        .filter(f => f.status === 'accepted')
        .map(f => f.friendUserId)
      if (friendNames.length > 0) {
        socket.send(JSON.stringify({
          type: 'check-status',
          friends: friendNames
        }))
      }
    }

    socket.onmessage = async (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return // Safe fallback
      }
      console.log('[WS] Received message:', msg)

      switch (msg.type) {
        case 'status-update': {
          setFriends((prev) =>
            prev.map((f) => {
              const cleanName = f.friendUserId.toLowerCase()
              if (msg.statuses[cleanName] !== undefined) {
                return { ...f, isOnline: msg.statuses[cleanName] }
              }
              return f
            })
          )
          break;
        }

        case 'incoming-invite': {
          if (msg.mediaType === 'file') {
            try {
              const meta = JSON.parse(msg.inviteMessage)
              const currentSelFriend = selectedFriendRef.current
              if (currentSelFriend && msg.senderUserId.toLowerCase() === currentSelFriend.friendUserId.toLowerCase()) {
                receiverInviteIdRef.current = meta.messageId
                const newMsg = {
                  id: meta.messageId || ('file-invite-' + Date.now()),
                  senderId: currentSelFriend.friendId,
                  receiverId: currentUser.id,
                  type: 'file-invite',
                  content: `Incoming file share: ${meta.name}`,
                  metadata: {
                    name: meta.name,
                    size: meta.size,
                    note: meta.note || '',
                    status: 'pending'
                  },
                  createdAt: new Date().toISOString()
                }
                setMessages((prev) => [...prev, newMsg])
              } else {
                toast(`📁 New file share from @${msg.senderUserId.toLowerCase()}`)
              }
            } catch (e) {
              console.error('Failed to parse incoming file metadata:', e)
            }
          } else {
            setIncomingInvite({
              senderUserId: msg.senderUserId.toLowerCase(),
              mediaType: msg.mediaType,
              inviteMessage: msg.inviteMessage
            })
          }
          break;
        }

        case 'invite-failed': {
          toast.error(msg.reason || 'Invitation failed.')
          cleanupCall()
          setTransferState(null)
          break;
        }

        case 'invite-response': {
          const isAccepted = msg.accepted
          const responseMsgId = msg.messageId

          if (responseMsgId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === responseMsgId
                  ? isAccepted
                    ? { ...m, metadata: { ...m.metadata, status: 'accepted' } }
                    : { ...m, type: 'text', content: 'File transfer invitation declined', metadata: null }
                  : m
              )
            )
          }

          if (isAccepted) {
            toast.success(`@${msg.senderUserId.toLowerCase()} accepted! Connecting...`)
            if (currentFileRef.current) {
              initiateFileWebRTCConnection(msg.senderUserId.toLowerCase(), true)
            } else {
              initiateWebRTCCall(msg.senderUserId.toLowerCase())
            }
          } else {
            toast.error(`@${msg.senderUserId.toLowerCase()} declined your invitation.`)
            cleanupCall()
            setTransferState(null)
            currentFileRef.current = null
          }
          break;
        }

        case 'signal': {
          if (msg.data && msg.data.channelType === 'file') {
            handleFileSignalingMessage(msg.fromUserId.toLowerCase(), msg.data)
          } else {
            handleSignalingMessage(msg.fromUserId.toLowerCase(), msg.data)
          }
          break;
        }

        case 'error': {
          toast.error(msg.message || 'Server error occurred.')
          break;
        }

        default:
          break;
      }
    }

    socket.onclose = () => {
      console.warn('[WS] Connection closed.')
    }

    return () => {
      socket.close()
      cleanupCall()
      cleanupFileTransfer()
    }
  }, [])

  // WebRTC Call handshakes
  const initiateWebRTCCall = async (targetUserId) => {
    try {
      setActiveCall({ friendUserId: targetUserId.toLowerCase(), role: 'caller' })

      let stream = localStreamRef.current
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setLocalStream(stream)
        localStreamRef.current = stream
      }

      const pc = new RTCPeerConnection(iceServers)
      pcRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'signal',
            targetUserId: targetUserId.toLowerCase(),
            data: { candidate: event.candidate }
          }))
        }
      }

      pc.ontrack = (event) => {
        if (!callStartTimeRef.current) callStartTimeRef.current = Date.now()
        const [rStream] = event.streams
        setRemoteStream(rStream)
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      wsRef.current.send(JSON.stringify({
        type: 'signal',
        targetUserId: targetUserId.toLowerCase(),
        data: { sdp: offer }
      }))

    } catch (err) {
      console.error('[WebRTC] Call Initiation Error:', err)
      toast.error('Failed to access video/audio devices.')
      cleanupCall()
    }
  }

  const handleSignalingMessage = async (fromUserId, data) => {
    try {
      if (data.sdp) {
        const pc = pcRef.current

        if (data.sdp.type === 'offer') {
          let stream = localStreamRef.current
          if (!stream) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            setLocalStream(stream)
            localStreamRef.current = stream
          }

          const newPc = new RTCPeerConnection(iceServers)
          pcRef.current = newPc

          stream.getTracks().forEach((track) => newPc.addTrack(track, stream))

          newPc.onicecandidate = (event) => {
            if (event.candidate && wsRef.current) {
              wsRef.current.send(JSON.stringify({
                type: 'signal',
                targetUserId: fromUserId.toLowerCase(),
                data: { candidate: event.candidate }
              }))
            }
          }

          newPc.ontrack = (event) => {
            if (!callStartTimeRef.current) callStartTimeRef.current = Date.now()
            const [rStream] = event.streams
            setRemoteStream(rStream)
          }

          await newPc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          
          if (videoPendingCandidatesRef.current && videoPendingCandidatesRef.current.length > 0) {
            for (const cand of videoPendingCandidatesRef.current) {
              try {
                await newPc.addIceCandidate(cand)
              } catch (e) {
                console.warn('[WebRTC Video] Error adding pending candidate:', e)
              }
            }
            videoPendingCandidatesRef.current = []
          }

          const answer = await newPc.createAnswer()
          await newPc.setLocalDescription(answer)

          wsRef.current.send(JSON.stringify({
            type: 'signal',
            targetUserId: fromUserId.toLowerCase(),
            data: { sdp: answer }
          }))
        } else if (data.sdp.type === 'answer' && pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          
          if (videoPendingCandidatesRef.current && videoPendingCandidatesRef.current.length > 0) {
            for (const cand of videoPendingCandidatesRef.current) {
              try {
                await pc.addIceCandidate(cand)
              } catch (e) {
                console.warn('[WebRTC Video] Error adding pending candidate:', e)
              }
            }
            videoPendingCandidatesRef.current = []
          }
        }
      } else if (data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate)
        const pc = pcRef.current
        if (!pc || !pc.remoteDescription) {
          if (!videoPendingCandidatesRef.current) videoPendingCandidatesRef.current = []
          videoPendingCandidatesRef.current.push(candidate)
        } else {
          await pc.addIceCandidate(candidate)
        }
      }
    } catch (err) {
      console.error('[WebRTC] Signaling error:', err)
    }
  }

  // WebRTC File Transfer Helper formatters
  const formatSpeed = (bytesPerSec) => {
    if (bytesPerSec === 0) return '0 B/s'
    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k))
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const cleanupFileTransfer = () => {
    if (filePcRef.current) {
      filePcRef.current.close()
      filePcRef.current = null
    }
    if (fileChannelRef.current) {
      fileChannelRef.current.close()
      fileChannelRef.current = null
    }
    fileChunksRef.current = []
    receivedBytesRef.current = 0
    currentFileRef.current = null
    fileNoteRef.current = ''
    setTransferFileNote('')
    fileInviteIdRef.current = null
    receiverInviteIdRef.current = null
    if (fileReaderRef.current) {
      fileReaderRef.current.abort()
      fileReaderRef.current = null
    }
  }

  const cancelFileTransfer = async () => {
    fileTransferCancelledRef.current = true
    if (fileChannelRef.current && fileChannelRef.current.readyState === 'open') {
      fileChannelRef.current.send('cancel')
    }
    setTransferState('failed')
    toast.error('File transfer cancelled')

    const failMsg = `Failed to transfer file: ${transferFileName} - cancelled`

    if (fileInviteIdRef.current) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === fileInviteIdRef.current
            ? {
                ...m,
                type: 'file',
                metadata: { ...m.metadata, status: 'failed' }
              }
            : m
        )
      )

      try {
        await authService.fetchAuth('/api/activities', {
          method: 'POST',
          body: JSON.stringify({
            receiverId: selectedFriendRef.current?.friendId || selectedFriend.friendId,
            type: 'file',
            content: failMsg,
            metadata: {
              name: transferFileName,
              size: transferFileSize,
              note: fileNoteRef.current,
              status: 'failed'
            }
          })
        })
      } catch (err) {
        console.error('Failed to log cancel in DB:', err)
      }
    }

    if (receiverInviteIdRef.current) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === receiverInviteIdRef.current
            ? {
                ...m,
                type: 'file',
                metadata: { ...m.metadata, status: 'failed' }
              }
            : m
        )
      )
    }

    setTimeout(() => {
      setTransferState(null)
      cleanupFileTransfer()
    }, 1500)
  }

  const initiateFileWebRTCConnection = async (targetUserId, isInitiator) => {
    try {
      fileTransferCancelledRef.current = false
      const pc = new RTCPeerConnection(iceServers)
      filePcRef.current = pc

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'signal',
            targetUserId: targetUserId.toLowerCase(),
            data: { candidate: event.candidate, channelType: 'file' }
          }))
        }
      }

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          setTransferState('failed')
          cleanupFileTransfer()
        }
      }

      if (isInitiator) {
        const channel = pc.createDataChannel('chat-file-transfer', { ordered: true })
        fileChannelRef.current = channel
        setupSenderDataChannel(channel, targetUserId)

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        wsRef.current.send(JSON.stringify({
          type: 'signal',
          targetUserId: targetUserId.toLowerCase(),
          data: { sdp: offer, channelType: 'file' }
        }))
      } else {
        pc.ondatachannel = (event) => {
          const channel = event.channel
          if (channel.label === 'chat-file-transfer') {
            fileChannelRef.current = channel
            setupReceiverDataChannel(channel)
          }
        }
      }
    } catch (err) {
      console.error('[WebRTC File] Connection Error:', err)
      setTransferState('failed')
      cleanupFileTransfer()
    }
  }

  const handleFileSignalingMessage = async (fromUserId, data) => {
    try {
      const pc = filePcRef.current
      if (data.sdp) {
        if (data.sdp.type === 'offer') {
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
            
            if (filePendingCandidatesRef.current && filePendingCandidatesRef.current.length > 0) {
              for (const cand of filePendingCandidatesRef.current) {
                try { await pc.addIceCandidate(cand) } catch(e){}
              }
              filePendingCandidatesRef.current = []
            }

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            wsRef.current.send(JSON.stringify({
              type: 'signal',
              targetUserId: fromUserId.toLowerCase(),
              data: { sdp: answer, channelType: 'file' }
            }))
          }
        } else if (data.sdp.type === 'answer' && pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          
          if (filePendingCandidatesRef.current && filePendingCandidatesRef.current.length > 0) {
            for (const cand of filePendingCandidatesRef.current) {
              try { await pc.addIceCandidate(cand) } catch(e){}
            }
            filePendingCandidatesRef.current = []
          }
        }
      } else if (data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate)
        if (!pc || !pc.remoteDescription) {
          if (!filePendingCandidatesRef.current) filePendingCandidatesRef.current = []
          filePendingCandidatesRef.current.push(candidate)
        } else {
          await pc.addIceCandidate(candidate)
        }
      }
    } catch (err) {
      console.error('[WebRTC File] Signal Error:', err)
      setTransferState('failed')
      cleanupFileTransfer()
    }
  }

  const setupSenderDataChannel = (channel, targetUserId) => {
    channel.binaryType = 'arraybuffer'
    
    channel.onopen = () => {
      setTransferState('sending')
      startSendingFileChunks(channel, targetUserId)
    }

    channel.onclose = () => {
      console.log('[WebRTC File] Data channel closed')
    }

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        if (event.data === 'cancel') {
          fileTransferCancelledRef.current = true
          setTransferState('failed')
          toast.error('Recipient cancelled the transfer')
          cleanupFileTransfer()
        }
      }
    }
  }

  const startSendingFileChunks = async (channel, targetUserId) => {
    const file = currentFileRef.current
    if (!file) {
      setTransferState('failed')
      return
    }

    const chunkSize = 16 * 1024
    const fileReader = new FileReader()
    fileReaderRef.current = fileReader
    let offset = 0
    let lastTime = Date.now()
    let bytesSentInInterval = 0

    const readSlice = (o) => {
      if (fileTransferCancelledRef.current) return
      const slice = file.slice(o, o + chunkSize)
      fileReader.readAsArrayBuffer(slice)
    }

    fileReader.onload = async (e) => {
      if (fileTransferCancelledRef.current) return
      const buffer = e.target.result

      try {
        channel.send(buffer)
      } catch (err) {
        console.error('[WebRTC File] Send chunk error:', err)
        setTransferState('failed')
        cleanupFileTransfer()
        return
      }

      offset += buffer.byteLength
      bytesSentInInterval += buffer.byteLength

      const pct = Math.floor((offset / file.size) * 100)
      setTransferProgress(pct)

      const now = Date.now()
      const elapsed = now - lastTime
      if (elapsed >= 1000) {
        setTransferSpeed(Math.floor((bytesSentInInterval * 1000) / elapsed))
        bytesSentInInterval = 0
        lastTime = now
      }

      if (offset < file.size) {
        if (channel.bufferedAmount > 64 * 1024) {
          channel.onbufferedamountlow = () => {
            channel.onbufferedamountlow = null
            readSlice(offset)
          }
        } else {
          setTimeout(() => readSlice(offset), 0)
        }
      } else {
        setTransferState('completed')
        toast.success('File sent successfully!')

        const contentMsg = `Sent file: ${file.name} (${formatSize(file.size)})${fileNoteRef.current ? ` - "${fileNoteRef.current}"` : ''}`

        setMessages((prev) =>
          prev.map((m) =>
            m.id === fileInviteIdRef.current
              ? {
                  ...m,
                  type: 'file',
                  metadata: {
                    ...m.metadata,
                    status: 'completed'
                  }
                }
              : m
          )
        )

        try {
          await authService.fetchAuth('/api/activities', {
            method: 'POST',
            body: JSON.stringify({
              receiverId: selectedFriendRef.current?.friendId || selectedFriend.friendId,
              type: 'file',
              content: contentMsg,
              metadata: {
                name: file.name,
                size: file.size,
                note: fileNoteRef.current,
                status: 'completed'
              }
            })
          })
        } catch (err) {
          console.error('Failed to log message in DB:', err)
        }

        setTimeout(() => {
          setTransferState(null)
          cleanupFileTransfer()
        }, 3000)
      }
    }

    readSlice(0)
  }

  const setupReceiverDataChannel = (channel) => {
    channel.binaryType = 'arraybuffer'
    fileChunksRef.current = []
    receivedBytesRef.current = 0
    setTransferState('receiving')
    let lastTime = Date.now()
    let bytesReceivedInInterval = 0

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        if (event.data === 'cancel') {
          fileTransferCancelledRef.current = true
          setTransferState('failed')
          toast.error('Sender cancelled the transfer')

          if (receiverInviteIdRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === receiverInviteIdRef.current
                  ? {
                      ...m,
                      type: 'file',
                      metadata: {
                        ...m.metadata,
                        status: 'failed'
                      }
                    }
                  : m
              )
            )
          }

          cleanupFileTransfer()
        }
        return
      }

      const buffer = event.data
      fileChunksRef.current.push(buffer)
      receivedBytesRef.current += buffer.byteLength
      bytesReceivedInInterval += buffer.byteLength

      const totalSize = transferFileSize || 1
      const pct = Math.floor((receivedBytesRef.current / totalSize) * 100)
      setTransferProgress(pct)

      const now = Date.now()
      const elapsed = now - lastTime
      if (elapsed >= 1000) {
        setTransferSpeed(Math.floor((bytesReceivedInInterval * 1000) / elapsed))
        bytesReceivedInInterval = 0
        lastTime = now
      }

      if (receivedBytesRef.current >= totalSize) {
        setTransferState('completed')
        toast.success('File received successfully!')

        const blob = new Blob(fileChunksRef.current)
        const downloadUrl = URL.createObjectURL(blob)
        const capturedFileName = transferFileName
        const capturedFileSize = transferFileSize

        // Store downloadUrl in the card so user can re-download anytime
        setMessages((prev) =>
          prev.map((m) =>
            m.id === receiverInviteIdRef.current
              ? {
                  ...m,
                  type: 'file',
                  metadata: {
                    ...m.metadata,
                    name: capturedFileName,
                    size: capturedFileSize,
                    status: 'completed',
                    downloadUrl
                  }
                }
              : m
          )
        )

        setTimeout(() => {
          setTransferState(null)
          cleanupFileTransfer()
        }, 4000)
      }
    }

    channel.onclose = () => {
      console.log('[WebRTC File] Receiver data channel closed')
    }
  }

  // Social / Chat Action Triggers
  const handleAddFriend = async (e) => {
    e.preventDefault()
    if (!searchUserId) return

    const cleanInputName = searchUserId.trim().toLowerCase(); // Convert User ID to lowercase

    try {
      const res = await authService.fetchAuth('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ friendUserId: cleanInputName })
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message)
        setSearchUserId('')
        fetchFriends()
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error('Failed to add friend.')
    }
  }

  const handleAcceptFriend = async (friendshipId) => {
    try {
      const res = await authService.fetchAuth('/api/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ friendshipId })
      })
      const data = await res.json()
      if (data.ok) {
        toast.success('Friend request accepted!')
        fetchFriends()
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error('Failed to accept request.')
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!selectedFriend) return

    const messageContent = messageText.trim()

    if (selectedFile) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const inviteId = 'file-invite-' + Date.now()
        fileInviteIdRef.current = inviteId

        const inviteMsg = {
          id: inviteId,
          senderId: currentUser.id,
          receiverId: selectedFriend.friendId,
          type: 'file-invite',
          content: `File transfer: ${selectedFile.name}`,
          metadata: {
            name: selectedFile.name,
            size: selectedFile.size,
            note: messageContent,
            status: 'pending'
          },
          createdAt: new Date().toISOString()
        }
        setMessages((prev) => [...prev, inviteMsg])

        wsRef.current.send(JSON.stringify({
          type: 'invite',
          targetUserId: selectedFriend.friendUserId.toLowerCase(),
          mediaType: 'file',
          inviteMessage: JSON.stringify({
            name: selectedFile.name,
            size: selectedFile.size,
            note: messageContent,
            messageId: inviteId
          })
        }))

        fileNoteRef.current = messageContent
        setMessageText('')

        setTransferFileName(selectedFile.name)
        setTransferFileSize(selectedFile.size)
        setTransferState('connecting')
        setTransferProgress(0)

        setSelectedFile(null)
      } else {
        toast.error('Signaling connection is closed. Unable to send file.')
      }
    } else if (messageContent) {
      setMessageText('')

      const tempMsg = {
        id: Math.random().toString(),
        senderId: currentUser.id,
        receiverId: selectedFriend.friendId,
        type: 'text',
        content: messageContent,
        createdAt: new Date().toISOString()
      }
      setMessages((prev) => [...prev, tempMsg])

      try {
        await authService.fetchAuth('/api/activities', {
          method: 'POST',
          body: JSON.stringify({
            receiverId: selectedFriend.friendId,
            type: 'text',
            content: messageContent
          })
        })
      } catch (err) {
        console.error('Failed to log message in DB:', err)
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          targetUserId: selectedFriend.friendUserId.toLowerCase(),
          data: {
            type: 'chat-message',
            text: messageContent
          }
        }))
      }
    }
  }

  // Hook up incoming real-time messages
  useEffect(() => {
    if (!wsRef.current) return

    const handleRealtimeChatMessage = (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      if (msg.type === 'signal' && msg.data?.type === 'chat-message' && selectedFriend) {
        if (msg.fromUserId.toLowerCase() === selectedFriend.friendUserId.toLowerCase()) {
          const newMsg = {
            id: Math.random().toString(),
            senderId: selectedFriend.friendId,
            receiverId: currentUser.id,
            type: 'text',
            content: msg.data.text,
            createdAt: new Date().toISOString()
          }
          setMessages((prev) => [...prev, newMsg])
        }
      }
    }

    wsRef.current.addEventListener('message', handleRealtimeChatMessage)
    return () => {
      wsRef.current?.removeEventListener('message', handleRealtimeChatMessage)
    }
  }, [selectedFriend, currentUser.id])

  const sendCallInvite = async (inviteMsg = 'Incoming Video Call') => {
    if (!selectedFriend || !selectedFriend.isOnline) {
      toast.error('Friend is offline.')
      return
    }

    toast.loading('Calling friend...', { id: 'call' })
    setActiveCall({ friendUserId: selectedFriend.friendUserId.toLowerCase(), role: 'caller' })
    callStartTimeRef.current = null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      localStreamRef.current = stream
    } catch (err) {
      console.error('Failed to get local stream', err)
      toast.error('Could not access camera/microphone')
      cleanupCall()
      return
    }

    wsRef.current.send(JSON.stringify({
      type: 'invite',
      targetUserId: selectedFriend.friendUserId.toLowerCase(),
      mediaType: 'video',
      inviteMessage: inviteMsg
    }))
  }

  const handleRespondInvite = async (accepted) => {
    if (!incomingInvite) return

    const targetUserId = incomingInvite.senderUserId.toLowerCase()
    setIncomingInvite(null)

    if (accepted) {
      setActiveCall({ friendUserId: targetUserId, role: 'receiver' })
      callStartTimeRef.current = null
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setLocalStream(stream)
        localStreamRef.current = stream

        // Send acceptance ONLY after camera is ready to prevent SDP race conditions
        wsRef.current.send(JSON.stringify({
          type: 'invite-response',
          targetUserId,
          accepted: true
        }))
      } catch (err) {
        console.error('Failed to get local stream', err)
        toast.error('Could not access camera/microphone')
        cleanupCall()

        // Send rejection if camera fails to open
        wsRef.current.send(JSON.stringify({
          type: 'invite-response',
          targetUserId,
          accepted: false
        }))
      }
    } else {
      wsRef.current.send(JSON.stringify({
        type: 'invite-response',
        targetUserId,
        accepted: false
      }))
    }
  }

  const handleAcceptInlineFileInvite = (msgId, senderUserId, name, size, note) => {
    receiverInviteIdRef.current = msgId

    wsRef.current.send(JSON.stringify({
      type: 'invite-response',
      targetUserId: senderUserId.toLowerCase(),
      accepted: true,
      messageId: msgId
    }))

    setTransferFileName(name)
    setTransferFileSize(size)
    setTransferFileNote(note || '')
    setTransferState('connecting')
    setTransferProgress(0)

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, metadata: { ...m.metadata, status: 'accepted' } }
          : m
      )
    )

    initiateFileWebRTCConnection(senderUserId.toLowerCase(), false)
  }

  const handleDeclineInlineFileInvite = (msgId, senderUserId) => {
    wsRef.current.send(JSON.stringify({
      type: 'invite-response',
      targetUserId: senderUserId.toLowerCase(),
      accepted: false,
      messageId: msgId
    }))

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, type: 'text', content: 'Declined file transfer request', metadata: null }
          : m
      )
    )
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      currentFileRef.current = file
      toast.success(`Attached: ${file.name}`)
    }
  }

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setMicMuted(!micMuted)
    }
  }

  const toggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setCamOff(!camOff)
    }
  }

  const endCall = () => {
    cleanupCall()
    toast.success('Call ended.')
  }

  const cleanupCall = () => {
    toast.dismiss('call')
    
    // Log call duration
    if (activeCall && selectedFriendRef.current) {
      const isCaller = activeCall.role === 'caller'
      const friendId = selectedFriendRef.current.friendId
      let content = ''
      let metadata = { status: 'missed', duration: 0 }
      
      if (callStartTimeRef.current) {
        const durationSec = Math.floor((Date.now() - callStartTimeRef.current) / 1000)
        const mins = Math.floor(durationSec / 60)
        const secs = durationSec % 60
        content = `Video Call - ${mins > 0 ? `${mins}m ` : ''}${secs}s`
        metadata = { status: 'completed', duration: durationSec }
      } else {
        content = 'Missed Call'
      }

      authService.fetchAuth('/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: friendId,
          type: 'video-call',
          content,
          metadata
        })
      }).then(res => res.json()).then(data => {
        if (data.ok && data.activity) {
          setMessages(prev => [...prev, data.activity])
        }
      }).catch(err => console.error('Error logging call', err))
    }

    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setRemoteStream(null)
    setActiveCall(null)
    setMicMuted(false)
    setCamOff(false)
    callStartTimeRef.current = null
  }

  // Bind local/remote video elements
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, activeCall])

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Focus add friend input field helper
  const focusAddFriendInput = () => {
    setMobileView('sidebar')
    setTimeout(() => {
      addContactInputRef.current?.focus()
    }, 100)
  }

  const acceptedFriends = friends.filter((f) => f.status === 'accepted')
  const pendingRequests = friends.filter((f) => f.status === 'pending' && !f.sentByMe)
  const sentRequests = friends.filter((f) => f.status === 'pending' && f.sentByMe)

  return (
    <div className="w-full h-full flex gap-5 px-6 mx-auto relative select-none">
      
      {/* 1. CONTACTS SIDEBAR */}
      <div 
        className={`w-full md:w-80 flex flex-col gap-4 bg-slate-950/65 backdrop-blur-xl border border-slate-900 rounded-[24px] p-5 shadow-2xl ${
          mobileView === 'sidebar' ? 'block' : 'hidden md:flex'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex flex-col">
          <h2 className="text-xl font-extrabold tracking-tight text-white">Messages</h2>
          <span className="text-[11px] font-semibold text-slate-500 mt-0.5">Your conversations</span>
        </div>

        {/* Add Friend Section */}
        <div className="bg-slate-900/35 border border-slate-900/60 p-3 rounded-2xl">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Add a contact</label>
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              ref={addContactInputRef}
              type="text"
              required
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              placeholder="User ID"
              className="flex-grow px-3 py-2 text-xs rounded-xl border border-slate-900 bg-slate-950/50 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 transition"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs active:scale-95 transition flex items-center justify-center h-8 w-8 shrink-0"
              title="Add Contact"
            >
              <PlusIcon />
            </button>
          </form>
        </div>

        {/* Pending Requests Block */}
        {pendingRequests.length > 0 && (
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border-t border-slate-900/80 pt-3">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pending Requests</h3>
            {pendingRequests.map((r) => (
              <div key={r.friendshipId} className="flex justify-between items-center bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-2">
                <span className="text-xs font-bold text-slate-300 truncate pr-1">@{r.friendUserId.toLowerCase()}</span>
                <button
                  onClick={() => handleAcceptFriend(r.friendshipId)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-wider transition active:scale-95 shrink-0"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sent Requests Block */}
        {sentRequests.length > 0 && (
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border-t border-slate-900/80 pt-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sent Requests</h3>
            {sentRequests.map((r) => (
              <div key={r.friendshipId} className="flex justify-between items-center bg-slate-900/20 border border-slate-900/60 rounded-xl p-2">
                <span className="text-xs font-bold text-slate-400 truncate pr-1">@{r.friendUserId.toLowerCase()}</span>
                <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider shrink-0 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/15">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Direct Contacts list */}
        <div className="flex-grow flex flex-col gap-1.5 overflow-y-auto border-t border-slate-900/80 pt-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Direct contacts</h3>
          
          {acceptedFriends.length === 0 ? (
            // Sidebar Empty State
            <div className="flex-grow flex flex-col items-center justify-center p-4 text-center mt-4">
              <div className="h-9 w-9 rounded-xl bg-slate-900/40 border border-slate-800/40 flex items-center justify-center text-slate-500 mb-2">
                <MessageCircleIcon className="h-4.5 w-4.5" />
              </div>
              <h4 className="text-xs font-extrabold text-slate-350">No conversations yet</h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1 mb-3">
                Add a contact using their User ID to start chatting securely.
              </p>
              <button
                onClick={focusAddFriendInput}
                className="px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-wider uppercase transition"
              >
                + Add Contact
              </button>
            </div>
          ) : (
            acceptedFriends.map((f) => {
              const active = selectedFriend?.friendId === f.friendId
              return (
                <button
                  key={f.friendshipId}
                  onClick={() => {
                    setSelectedFriend(f)
                    setMobileView('chat')
                  }}
                  className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition duration-200 text-left border ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20 text-indigo-400 font-bold'
                      : 'border-transparent text-slate-450 hover:bg-slate-900/25 hover:text-slate-200'
                  }`}
                >
                  {/* Custom Avatar with presence dot */}
                  <div className="relative h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-650 to-purple-700 flex items-center justify-center font-black text-white text-[11px] tracking-tight shrink-0 shadow-md">
                    {f.friendUserId.substring(0, 2).toLowerCase()}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[2px] border-slate-950 ${
                      f.isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                    }`} />
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-extrabold truncate">@{f.friendUserId.toLowerCase()}</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider shrink-0">
                        {f.isOnline ? 'online' : 'offline'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5 font-semibold">
                      Secure P2P tunnel active.
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* 2. CHAT / CONVERSATION AREA */}
      <div 
        className={`flex-grow flex flex-col bg-slate-950/65 backdrop-blur-xl border border-slate-900 rounded-[24px] overflow-hidden shadow-2xl ${
          mobileView === 'chat' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="px-5 py-3 border-b border-slate-900 flex justify-between items-center bg-slate-900/15">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setMobileView('sidebar')}
                  className="md:hidden p-2 rounded-lg bg-slate-900 text-slate-400 active:scale-95 transition"
                  title="Back to Messages"
                >
                  <ArrowLeftIcon className="h-4.5 w-4.5" />
                </button>

                <div className="relative h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-650 to-purple-700 flex items-center justify-center font-black text-white text-[11px] tracking-tight">
                  {selectedFriend.friendUserId.substring(0, 2).toLowerCase()}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[2px] border-slate-950 ${
                    selectedFriend.isOnline ? 'bg-emerald-500' : 'bg-slate-650'
                  }`} />
                </div>

                <div>
                  <h3 className="text-xs font-extrabold text-white">@{selectedFriend.friendUserId.toLowerCase()}</h3>
                  <span className="text-[9px] text-slate-550 font-black uppercase tracking-wider mt-0.5 block">
                    {selectedFriend.isOnline ? 'Active Now' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex gap-2">
                <button
                  onClick={() => sendCallInvite('Video connection request')}
                  disabled={!selectedFriend.isOnline}
                  title={selectedFriend.isOnline ? 'Initiate P2P Video Call' : 'User is offline'}
                  className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-400 border border-indigo-500/15 active:scale-95 transition disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <VideoIcon className="h-4.5 w-4.5" />
                </button>
                <button
                  disabled
                  title="Voice calling placeholder"
                  className="p-2 rounded-xl bg-slate-900 text-slate-500 border border-slate-800 opacity-40 cursor-not-allowed"
                >
                  <PhoneIcon className="h-4.5 w-4.5" />
                </button>
                <button
                  title="More actions"
                  className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
                >
                  <MoreVerticalIcon className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <div ref={messageFeedRef} className="flex-grow p-5 overflow-y-auto space-y-4 bg-slate-950/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <span className="text-xs font-bold italic">No messages exchanged yet. Type below to start chat.</span>
                </div>
              ) : (
                messages.map((m, index) => {
                  const isMe = m.senderId === currentUser.id
                  const prevMsg = index > 0 ? messages[index - 1] : null
                  const isGrouped = prevMsg && prevMsg.senderId === m.senderId && 
                    (new Date(m.createdAt) - new Date(prevMsg.createdAt) < 3 * 60 * 1000)

                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-1' : 'mt-4'} w-full`}>
                      {(m.type === 'file-invite' || m.type === 'file') && m.metadata ? (
                        <>
                          {!isMe && !isGrouped && (
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-2">
                              @{selectedFriend.friendUserId.toLowerCase()}
                            </span>
                          )}

                          <div className={`p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed border shadow-md flex flex-col gap-2 ${
                            isMe
                              ? 'bg-slate-900 border-indigo-500/30 text-slate-100 rounded-tr-none'
                              : 'bg-slate-900 border-slate-800 text-slate-100 rounded-tl-none'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">📁</span>
                              <div>
                                <p className="font-extrabold text-slate-100 truncate">{m.metadata.name}</p>
                                <p className="text-[10px] text-slate-550 font-bold">{formatSize(m.metadata.size)}</p>
                              </div>
                            </div>

                            {m.metadata.note && (
                              <p className="text-slate-400 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-950/50">
                                "{m.metadata.note}"
                              </p>
                            )}

                            <div className="mt-1 flex items-center justify-between gap-4 flex-wrap">
                              <span className={`text-[10px] uppercase font-black tracking-wider ${
                                m.metadata.status === 'completed' ? 'text-emerald-400' :
                                m.metadata.status === 'failed' ? 'text-rose-400' :
                                'text-indigo-400'
                              }`}>
                                {m.metadata.status === 'pending' && (isMe ? '📤 Invite Sent' : '📥 Incoming File')}
                                {m.metadata.status === 'accepted' && '⏳ Transferring...'}
                                {m.metadata.status === 'completed' && (isMe ? '✅ Sent' : '✅ Received')}
                                {m.metadata.status === 'failed' && '❌ Transfer Failed'}
                                {m.metadata.status === 'declined' && '🚫 Declined'}
                              </span>

                              <div className="flex gap-2">
                                {/* Accept / Decline – only for pending receiver */}
                                {!isMe && m.metadata.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDeclineInlineFileInvite(m.id, selectedFriend.friendUserId)}
                                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-500 font-extrabold transition active:scale-95 text-[10px]"
                                    >
                                      Decline
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAcceptInlineFileInvite(m.id, selectedFriend.friendUserId, m.metadata.name, m.metadata.size, m.metadata.note)}
                                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold transition active:scale-95 text-[10px]"
                                    >
                                      Accept
                                    </button>
                                  </>
                                )}

                                {/* Download button – only for receiver after completed */}
                                {!isMe && m.metadata.status === 'completed' && m.metadata.downloadUrl && (
                                  <a
                                    href={m.metadata.downloadUrl}
                                    download={m.metadata.name}
                                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold transition active:scale-95 text-[10px] flex items-center gap-1"
                                  >
                                    ⬇ Download
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Hover timestamp */}
                            <span className={`block text-[7px] text-right font-bold uppercase tracking-widest mt-1 opacity-50`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </>
                      ) : m.type === 'video-call' ? (
                        <>
                          <div className={`p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed border shadow-md flex flex-col gap-2 ${
                            isMe
                              ? 'bg-slate-900 border-indigo-500/30 text-slate-100 rounded-tr-none'
                              : 'bg-slate-900 border-slate-800 text-slate-100 rounded-tl-none'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{m.metadata?.status === 'missed' ? '🚫' : '📞'}</span>
                              <div>
                                <p className="font-extrabold text-slate-100 truncate">{m.content}</p>
                              </div>
                            </div>
                            <span className={`block text-[7px] text-right font-bold uppercase tracking-widest mt-1 opacity-50`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Show user ID label for incoming if not grouped */}
                          {!isMe && !isGrouped && (
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-2">
                              @{selectedFriend.friendUserId.toLowerCase()}
                            </span>
                          )}

                          <div className={`group relative max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-gradient-to-tr from-indigo-600 to-purple-650 text-white rounded-tr-none'
                              : 'bg-slate-900 border border-slate-900/60 text-slate-200 rounded-tl-none'
                          }`}>
                            <p className="font-semibold select-text">{m.content}</p>

                            {/* Hover timestamp */}
                            <span className={`block text-[7px] text-right font-bold uppercase tracking-widest mt-1 opacity-50`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* P2P File Transfer Progress overlay */}
            {transferState && (
              <div className="mx-4 mb-2 p-3.5 rounded-2xl bg-slate-900/90 backdrop-blur border border-indigo-500/20 text-xs shadow-xl animate-fade-in">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="font-extrabold text-slate-100 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                    {transferState === 'connecting' && 'Establishing direct P2P tunnel...'}
                    {transferState === 'sending' && `Sending: ${transferFileName}`}
                    {transferState === 'receiving' && `Receiving: ${transferFileName}`}
                    {transferState === 'completed' && 'Transfer completed successfully!'}
                    {transferState === 'failed' && 'Transfer failed or cancelled.'}
                  </div>
                  {['connecting', 'sending', 'receiving'].includes(transferState) && (
                    <button
                      type="button"
                      onClick={cancelFileTransfer}
                      className="text-[10px] uppercase font-black tracking-wider text-rose-500 hover:text-rose-400 bg-rose-950/20 border border-rose-500/20 px-2.5 py-1 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {['sending', 'receiving'].includes(transferState) && (
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${transferProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>{transferProgress}%</span>
                      <span>Speed: {formatSpeed(transferSpeed)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selected File Badge */}
            {selectedFile && (
              <div className="mx-4 mb-2 p-2 rounded-xl bg-slate-900 border border-indigo-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="font-semibold">{selectedFile.name}</span>
                  <span className="text-[10px] text-slate-500">({formatSize(selectedFile.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    currentFileRef.current = null
                  }}
                  className="text-rose-500 hover:text-rose-400 font-bold px-2 py-0.5 rounded-lg bg-slate-950/40"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Message Composer */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-900/80 bg-slate-950/40 flex gap-2 relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Attachment Popover Menu */}
              {showAttachmentMenu && (
                <div className="absolute bottom-16 left-4 w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-50 animate-slideUp">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false)
                      fileInputRef.current?.click()
                    }}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-slate-800 text-slate-300 transition text-sm font-semibold"
                  >
                    📄 Document
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false)
                      sendCallInvite('Video connection request')
                    }}
                    disabled={!selectedFriend.isOnline}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-slate-800 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-semibold"
                  >
                    📹 Video Call
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                title="Attachments"
                className="px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition active:scale-95 text-sm font-bold"
              >
                +
              </button>
              
              <input
                type="text"
                required={!selectedFile}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={selectedFile ? "Add a message or press Send to share file..." : "Write a secure message..."}
                className="flex-grow px-4 py-2.5 rounded-xl border border-slate-900 bg-slate-950/80 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
              />

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 text-white font-extrabold text-xs hover:shadow-lg hover:shadow-indigo-500/10 transition active:scale-95 flex items-center justify-center"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          // Chat Center Empty State
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-slate-950/20">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
              <MessageCircleIcon className="h-6 w-6" />
            </div>
            <h2 className="text-base font-extrabold text-white tracking-tight">Start a conversation</h2>
            <p className="max-w-xs text-[11px] text-slate-500 leading-relaxed font-semibold mt-1.5 mb-5">
              Select a contact from the sidebar list to start exchanging direct messages and secure calls.
            </p>
            <button
              onClick={focusAddFriendInput}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider uppercase transition active:scale-95"
            >
              + Add a Contact
            </button>
          </div>
        )}
      </div>

      {/* 3. INCOMING CALL NOTIFICATION MODAL */}
      {incomingInvite && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-[24px] bg-slate-900 border border-indigo-500/20 p-6 shadow-2xl flex flex-col items-center text-center animate-slideDown">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <VideoIcon className="h-6 w-6 animate-pulse" />
            </div>
            
            <h3 className="text-sm font-extrabold text-white">Incoming Call</h3>
            <p className="text-xs text-indigo-400 font-bold mt-1">@{incomingInvite.senderUserId} is calling you...</p>
            
            <div className="my-4 px-4 py-3 rounded-xl bg-slate-950 border border-slate-900 text-xs font-semibold text-slate-400 italic">
              "{incomingInvite.inviteMessage}"
            </div>

            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => handleRespondInvite(false)}
                className="flex-grow py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-extrabold uppercase tracking-wider transition active:scale-95"
              >
                Decline
              </button>
              <button
                onClick={() => handleRespondInvite(true)}
                className="flex-grow py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold uppercase tracking-wider transition active:scale-95"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}



      {/* 4. FULL-SCREEN VIDEO CALL OVERLAY */}
      {activeCall && (localStream || remoteStream) && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-50 flex flex-col justify-between p-6 select-none">
          
          {/* Call Header */}
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
              Direct Peer Link: @{activeCall.friendUserId}
            </span>
            <span className="flex items-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              WebRTC P2P Active
            </span>
          </div>

          {/* Videos Grid */}
          <div className="relative flex-grow flex items-center justify-center my-6 rounded-[24px] overflow-hidden bg-slate-900 border border-slate-800 shadow-inner">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 font-bold gap-3">
                <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs">Connecting remote peer stream...</span>
              </div>
            )}

            {/* Local Feed PIP */}
            {localStream && (
              <div className="absolute bottom-5 right-5 w-36 sm:w-44 aspect-[4/3] rounded-xl overflow-hidden border border-slate-750 shadow-2xl bg-slate-950">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${camOff ? 'hidden' : ''}`}
                />
                {camOff && (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-550 font-bold uppercase tracking-wider">
                    Camera Disabled
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Call Controls Dock */}
          <div className="flex justify-center items-center gap-3.5 relative z-10">
            {/* Mic Toggle Button */}
            <button
              onClick={toggleMic}
              className={`p-3.5 rounded-full border transition active:scale-90 ${
                micMuted
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-500 hover:bg-rose-500/20'
                  : 'bg-white/10 border-slate-800 text-slate-100 hover:bg-white/15'
              }`}
              title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </button>

            {/* Camera Toggle Button */}
            <button
              onClick={toggleCam}
              className={`p-3.5 rounded-full border transition active:scale-90 ${
                camOff
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-500 hover:bg-rose-500/20'
                  : 'bg-white/10 border-slate-800 text-slate-100 hover:bg-white/15'
              }`}
              title={camOff ? 'Enable Camera' : 'Disable Camera'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </button>

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 active:scale-90 transition flex items-center justify-center"
              title="Hang Up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
              </svg>
            </button>
          </div>

        </div>
      )}

    </div>
  )
}
