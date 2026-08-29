import re
import sys

with open('client/src/pages/ChatHub.jsx', 'r') as f:
    content = f.read()

# 1. Add latestHandlersRef
handlers_ref = """  const latestHandlersRef = useRef({});
  useEffect(() => {
    latestHandlersRef.current = {
      handleSignalingMessage,
      handleFileSignalingMessage,
      setFriends,
      setIncomingInvite,
      setMessages,
      cleanupCall,
      setTransferState,
      initiateFileWebRTCConnection,
      initiateWebRTCCall,
      toast,
      currentUser,
      selectedFriendRef
    };
  });

  // Connect to WebSocket Signaling Server"""
content = content.replace("  // Connect to WebSocket Signaling Server", handlers_ref)


# 2. Replace the WebSocket useEffect logic
ws_effect_pattern = re.compile(r"useEffect\(\(\) => \{\n    let wsUrl = '';(.*?)\n  \}, \[\]\)", re.DOTALL)
ws_effect_match = ws_effect_pattern.search(content)

if not ws_effect_match:
    print("Could not find WS useEffect")
    sys.exit(1)

new_ws_effect = """useEffect(() => {
    let wsUrl = '';
    // eslint-disable-next-line no-undef
    const backendUrl = typeof __BACKEND_URL__ !== 'undefined' ? __BACKEND_URL__ : import.meta.env.VITE_API_URL;
    
    if (backendUrl) {
      try {
        const urlObj = new URL(backendUrl);
        const wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${wsProtocol}//${urlObj.host}?token=${authService.getToken()}`;
      } catch (e) {
        console.error("Invalid Backend URL", e);
      }
    }
    
    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const isDev = window.location.port === '5173' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const signalingHost = isDev ? `${window.location.hostname}:3001` : window.location.host
      wsUrl = `${protocol}//${signalingHost}?token=${authService.getToken()}`
    }

    let socket = null;
    let isMounted = true;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;

    const connectWS = () => {
      if (!isMounted) return;
      socket = new WebSocket(wsUrl)
      wsRef.current = socket

      socket.onopen = () => {
        console.log('[WS] Connected to signaling server.')
        reconnectAttempts = 0; // reset
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
        
        const h = latestHandlersRef.current;

        switch (msg.type) {
          case 'status-update': {
            h.setFriends((prev) =>
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
                const currentSelFriend = h.selectedFriendRef.current
                if (currentSelFriend && msg.senderUserId.toLowerCase() === currentSelFriend.friendUserId.toLowerCase()) {
                  receiverInviteIdRef.current = meta.messageId
                  const newMsg = {
                    id: meta.messageId || ('file-invite-' + Date.now()),
                    senderId: currentSelFriend.friendId,
                    receiverId: h.currentUser.id,
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
                  h.setMessages((prev) => [...prev, newMsg])
                } else {
                  h.toast(`📁 New file share from @${msg.senderUserId.toLowerCase()}`)
                }
              } catch (e) {
                console.error('Failed to parse incoming file metadata:', e)
              }
            } else if (msg.mediaType === 'video') {
              const currentSelFriend = h.selectedFriendRef.current
              if (currentSelFriend && msg.senderUserId.toLowerCase() === currentSelFriend.friendUserId.toLowerCase()) {
                const newMsg = {
                  id: 'call-invite-' + Date.now(),
                  senderId: currentSelFriend.friendId,
                  receiverId: h.currentUser.id,
                  type: 'call-invite',
                  content: `Incoming video call...`,
                  metadata: { status: 'pending' },
                  createdAt: new Date().toISOString()
                }
                h.setMessages((prev) => [...prev, newMsg])
              } else {
                h.setIncomingInvite({
                  senderUserId: msg.senderUserId.toLowerCase(),
                  mediaType: msg.mediaType,
                  inviteMessage: msg.inviteMessage
                })
              }
            } else {
              h.setIncomingInvite({
                senderUserId: msg.senderUserId.toLowerCase(),
                mediaType: msg.mediaType,
                inviteMessage: msg.inviteMessage
              })
            }
            break;
          }

          case 'invite-failed': {
            h.toast.error(msg.reason || 'Invitation failed.')
            h.cleanupCall()
            h.setTransferState(null)
            break;
          }

          case 'invite-response': {
            const isAccepted = msg.accepted
            const responseMsgId = msg.messageId

            if (responseMsgId) {
              h.setMessages((prev) =>
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
              h.toast.success(`@${msg.senderUserId.toLowerCase()} accepted! Connecting...`)
              if (currentFileRef.current) {
                h.initiateFileWebRTCConnection(msg.senderUserId.toLowerCase(), true)
              } else {
                h.initiateWebRTCCall(msg.senderUserId.toLowerCase())
              }
            } else {
              h.toast.error(`@${msg.senderUserId.toLowerCase()} declined your invitation.`)
              h.cleanupCall()
              h.setTransferState(null)
              currentFileRef.current = null
            }
            break;
          }

          case 'signal': {
            if (msg.data && msg.data.channelType === 'file') {
              h.handleFileSignalingMessage(msg.fromUserId.toLowerCase(), msg.data)
            } else {
              h.handleSignalingMessage(msg.fromUserId.toLowerCase(), msg.data)
            }
            break;
          }

          case 'error': {
            h.toast.error(msg.message || 'Server error occurred.')
            break;
          }

          default:
            break;
        }
      }

      socket.onclose = () => {
        console.warn('[WS] Connection closed.')
        if (isMounted) {
           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
           reconnectAttempts++;
           reconnectTimeout = setTimeout(connectWS, delay);
        }
      }
    }

    connectWS();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
      if (latestHandlersRef.current.cleanupCall) {
         latestHandlersRef.current.cleanupCall();
         latestHandlersRef.current.cleanupFileTransfer();
      }
    }
  }, [])"""

content = content[:ws_effect_match.start()] + new_ws_effect + content[ws_effect_match.end():]

# 3. Throttle chunk progress (sender)
sender_loop_pattern = re.compile(r"offset \+= buffer\.byteLength(.*?)if \(offset < file\.size\)", re.DOTALL)
sender_loop_match = sender_loop_pattern.search(content)

if sender_loop_match:
    new_sender_loop = """offset += buffer.byteLength
      bytesSentInInterval += buffer.byteLength

      const now = Date.now()
      const elapsed = now - lastTime
      if (elapsed >= 500 || offset >= file.size) {
        const pct = Math.floor((offset / file.size) * 100)
        setTransferProgress(pct)
        setTransferSpeed(Math.floor((bytesSentInInterval * 1000) / elapsed))
        bytesSentInInterval = 0
        lastTime = now
      }

      if (offset < file.size)"""
    content = content[:sender_loop_match.start()] + new_sender_loop + content[sender_loop_match.end():]

# 4. Throttle chunk progress (receiver)
receiver_loop_pattern = re.compile(r"const pct = Math\.floor\(\(receivedBytesRef\.current / totalSize\) \* 100\)\n      setTransferProgress\(pct\)(.*?)if \(receivedBytesRef\.current >= totalSize\)", re.DOTALL)
receiver_loop_match = receiver_loop_pattern.search(content)

if receiver_loop_match:
    new_receiver_loop = """const now = Date.now()
      const elapsed = now - lastTime
      if (elapsed >= 500 || receivedBytesRef.current >= totalSize) {
        const pct = Math.floor((receivedBytesRef.current / totalSize) * 100)
        setTransferProgress(pct)
        setTransferSpeed(Math.floor((bytesReceivedInInterval * 1000) / elapsed))
        bytesReceivedInInterval = 0
        lastTime = now
      }

      if (receivedBytesRef.current >= totalSize)"""
    content = content[:receiver_loop_match.start()] + new_receiver_loop + content[receiver_loop_match.end():]

# 5. JSX call-invite addition
jsx_pattern = "m.type === 'video-call' ? ("
jsx_replacement = """m.type === 'call-invite' ? (
                        <>
                          <div className={`p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed border shadow-md flex flex-col gap-2 ${
                            isMe
                              ? 'bg-slate-900 border-indigo-500/30 text-slate-100 rounded-tr-none'
                              : 'bg-slate-900 border-slate-800 text-slate-100 rounded-tl-none'
                          }`}>
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-indigo-400">📞 Video Call</span>
                              <span className="text-slate-300">{m.content}</span>
                            </div>
                            
                            {!isMe && m.metadata.status === 'pending' && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, metadata: { status: 'accepted' } } : msg))
                                    answerCall(selectedFriend.friendUserId)
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold transition active:scale-95 text-[10px]"
                                >
                                  Answer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, metadata: { status: 'declined' } } : msg))
                                    wsRef.current.send(JSON.stringify({
                                      type: 'invite-response',
                                      targetUserId: selectedFriend.friendUserId.toLowerCase(),
                                      accepted: false
                                    }))
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-500 font-extrabold transition active:scale-95 text-[10px]"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                            {m.metadata.status === 'accepted' && <span className="text-[10px] text-emerald-500 font-bold mt-1">Ongoing...</span>}
                            {m.metadata.status === 'declined' && <span className="text-[10px] text-rose-500 font-bold mt-1">Declined</span>}
                          </div>
                        </>
                      ) : m.type === 'video-call' ? ("""
content = content.replace(jsx_pattern, jsx_replacement)


# 6. cleanupFileTransfer in useEffect cleanup is undefined? No, it's defined earlier in component? Actually wait, it's defined at line 514. But latestHandlersRef has `cleanupFileTransfer`?
# Need to add cleanupFileTransfer to latestHandlersRef
content = content.replace("cleanupCall,", "cleanupCall,\n      cleanupFileTransfer,")


with open('client/src/pages/ChatHub.jsx', 'w') as f:
    f.write(content)

print("Patch applied")
