import { useEffect, useState, useRef } from 'react'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'
import { ChatSidebar } from '../components/Chat/ChatSidebar'
import { VideoCallOverlay } from '../components/Chat/VideoCallOverlay'
import { ChatMessageFeed } from '../components/Chat/ChatMessageFeed'

import { useChatWebSocket } from '../hooks/useChatWebSocket'
import { useWebRTCVideo } from '../hooks/useWebRTCVideo'
import { useWebRTCFile } from '../hooks/useWebRTCFile'

export default function ChatHub() {
  const [currentUser] = useState(() => authService.getCurrentUser())

  // Core UI State
  const [friends, setFriends] = useState([])
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [searchUserId, setSearchUserId] = useState('')
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [mobileView, setMobileView] = useState('sidebar') // 'sidebar' | 'chat'
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})

  // Core Refs
  const wsRef = useRef(null)
  const friendsRef = useRef([])
  const selectedFriendRef = useRef(null)
  const addContactInputRef = useRef(null)
  const messageFeedRef = useRef(null)
  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Keep refs in sync
  useEffect(() => { friendsRef.current = friends }, [friends])
  useEffect(() => { selectedFriendRef.current = selectedFriend }, [selectedFriend])

  // Keep selectedFriend in sync with friends array updates (e.g. online status changes)
  useEffect(() => {
    if (selectedFriend) {
      const updatedFriend = friends.find(f => f.friendId === selectedFriend.friendId)
      if (updatedFriend && updatedFriend !== selectedFriend) {
        setSelectedFriend(updatedFriend)
      }
    }
  }, [friends, selectedFriend])

  // Sync online status when friends are loaded or updated
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && friends.length > 0) {
      const friendNames = friends
        .filter(f => f.status === 'accepted')
        .map(f => f.friendUserId)
      
      if (friendNames.length > 0) {
        wsRef.current.send(JSON.stringify({
          type: 'check-status',
          friends: friendNames
        }))
      }
    }
  }, [friends.length])

  // ICE Servers config
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  // --- Initialize Custom Hooks ---

  // 1. File Transfer P2P Hook
  const {
    selectedFile, setSelectedFile, transferState, setTransferState,
    transferProgress, transferSpeed, transferFileName, setTransferFileName,
    transferFileSize, setTransferFileSize, fileNoteRef, currentFileRef,
    fileInviteIdRef, receiverInviteIdRef, cancelFileTransfer, cleanupFileTransfer,
    handleFileChange, handleAcceptInlineFileInvite, handleDeclineInlineFileInvite,
    initiateFileWebRTCConnection, handleFileSignaling
  } = useWebRTCFile({
    wsRef, setMessages, toast, iceServers, selectedFriendRef
  })

  // 2. Video Call P2P Hook
  const {
    activeCall, localStream, remoteStream, micMuted, camOff,
    toggleMic, toggleCam, endCall, answerCall, sendCallInvite,
    initiateWebRTCCall, handleVideoSignaling, cleanupCall, activeCallRef
  } = useWebRTCVideo({
    wsRef, setMessages, toast, iceServers, selectedFriendRef, receiverInviteIdRef
  })

  // 3. Main WebSocket Signaling Hook
  useChatWebSocket({
    wsRef, currentUser, friendsRef, setFriends, setMessages, toast,
    handleVideoSignaling, handleFileSignaling, cleanupCall, cleanupFileTransfer,
    initiateWebRTCCall, initiateFileWebRTCConnection, selectedFriendRef,
    receiverInviteIdRef, currentFileRef, setTransferState, setUnreadCounts, activeCallRef
  })

  // --- Core API Functions ---

  const fetchFriends = async () => {
    try {
      const res = await authService.fetchAuth('/api/friends')
      const data = await res.json()
      if (data.ok) {
        setFriends(data.friends)
        // Note: initial online status is pulled when the WS connects inside the hook!
      }
    } catch (err) {
      console.error('Error fetching friends:', err)
    }
  }

  useEffect(() => {
    fetchFriends()
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    if (messageFeedRef.current) {
      messageFeedRef.current.scrollTop = messageFeedRef.current.scrollHeight;
    }
  }, [messages])

  // Focus add friend input
  const focusAddFriendInput = () => {
    if (mobileView === 'chat') setMobileView('sidebar')
    setTimeout(() => addContactInputRef.current?.focus(), 300)
  }

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend)
    setUnreadCounts(prev => ({ ...prev, [friend.friendUserId]: 0 }))
    if (mobileView === 'sidebar') setMobileView('chat')
  }

  // Social / Chat Action Triggers
  const handleAddFriend = async (e) => {
    e.preventDefault()
    if (!searchUserId) return
    const cleanInputName = searchUserId.trim().toLowerCase()
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
        try {
          const res = await authService.fetchAuth('/api/activities', {
            method: 'POST',
            body: JSON.stringify({
              receiverId: selectedFriend.friendId,
              type: 'file-invite',
              content: `File transfer: ${selectedFile.name}`,
              metadata: {
                name: selectedFile.name,
                size: selectedFile.size,
                note: messageContent,
                status: 'pending'
              }
            })
          });
          const data = await res.json();

          if (data.ok && data.log) {
            fileInviteIdRef.current = data.log.id;
            setMessages((prev) => [...prev, data.log]);

            wsRef.current.send(JSON.stringify({
              type: 'invite',
              targetUserId: selectedFriend.friendUserId.toLowerCase(),
              mediaType: 'file',
              inviteMessage: JSON.stringify(data.log)
            }));
          } else {
            toast.error('Failed to send file invite.');
            return;
          }
        } catch (err) {
          console.error('Failed to log file invite:', err);
          toast.error('Failed to send file invite.');
          return;
        }

        fileNoteRef.current = messageContent
        setMessageText('')
        setTransferFileName(selectedFile.name)
        setTransferFileSize(selectedFile.size)
        setTransferState('connecting')
        setTransferProgress(0)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
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
          data: { type: 'chat-message', text: messageContent }
        }))
      }
    }
  }

  // Load chat history when selected friend changes
  useEffect(() => {
    if (!selectedFriend) {
      setMessages([])
      return
    }

    const loadHistory = async () => {
      try {
        const res = await authService.fetchAuth(`/api/activities?friendId=${selectedFriend.friendId}`)
        const data = await res.json()
        if (data.ok && data.logs) {
          setMessages(data.logs)
        }
      } catch (err) {
        console.error('Failed to load chat history:', err)
      }
    }

    loadHistory()
  }, [selectedFriend])

  // --- Formatters ---
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s'
    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s']
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k))
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Split friends by status
  const acceptedFriends = friends.filter((f) => f.status === 'accepted')
  const pendingRequests = friends.filter((f) => f.status === 'pending' && !f.sentByMe)
  const sentRequests = friends.filter((f) => f.status === 'pending' && f.sentByMe)

  return (
    <div className="w-full h-full flex gap-5 px-6 mx-auto relative select-none min-h-0">

      {/* 1. CONTACTS SIDEBAR */}
      <ChatSidebar
        mobileView={mobileView}
        setMobileView={setMobileView}
        searchUserId={searchUserId}
        setSearchUserId={setSearchUserId}
        handleAddFriend={handleAddFriend}
        addContactInputRef={addContactInputRef}
        pendingRequests={pendingRequests}
        handleAcceptFriend={handleAcceptFriend}
        sentRequests={sentRequests}
        acceptedFriends={acceptedFriends}
        selectedFriend={selectedFriend}
        setSelectedFriend={handleSelectFriend}
        unreadCounts={unreadCounts}
        focusAddFriendInput={focusAddFriendInput}
      />

      {/* 2. CHAT / CONVERSATION AREA */}
      <ChatMessageFeed
        selectedFriend={selectedFriend}
        mobileView={mobileView}
        setMobileView={setMobileView}
        sendCallInvite={sendCallInvite}
        messageFeedRef={messageFeedRef}
        messages={messages}
        currentUser={currentUser}
        formatSize={formatSize}
        handleDeclineInlineFileInvite={handleDeclineInlineFileInvite}
        handleAcceptInlineFileInvite={handleAcceptInlineFileInvite}
        setMessages={setMessages}
        answerCall={answerCall}
        wsRef={wsRef}
        chatEndRef={chatEndRef}
        transferState={transferState}
        transferFileName={transferFileName}
        transferProgress={transferProgress}
        transferSpeed={transferSpeed}
        cancelFileTransfer={cancelFileTransfer}
        formatSpeed={formatSpeed}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        currentFileRef={currentFileRef}
        handleSendMessage={handleSendMessage}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        showAttachmentMenu={showAttachmentMenu}
        setShowAttachmentMenu={setShowAttachmentMenu}
        messageText={messageText}
        setMessageText={setMessageText}
        focusAddFriendInput={focusAddFriendInput}
      />

      {/* 3. ACTIVE P2P VIDEO CALL OVERLAY */}
      <VideoCallOverlay
        activeCall={activeCall}
        localStream={localStream}
        remoteStream={remoteStream}
        micMuted={micMuted}
        camOff={camOff}
        toggleMic={toggleMic}
        toggleCam={toggleCam}
        endCall={endCall}
      />
    </div>
  )
}
