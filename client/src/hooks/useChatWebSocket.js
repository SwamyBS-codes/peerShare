import { useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService';

export function useChatWebSocket({
  wsRef,
  currentUser,
  friendsRef,
  setFriends,
  setMessages,
  toast,
  handleVideoSignaling,
  handleFileSignaling,
  cleanupCall,
  cleanupFileTransfer,
  initiateWebRTCCall,
  initiateFileWebRTCConnection,
  selectedFriendRef,
  receiverInviteIdRef,
  currentFileRef,
  setTransferState,
  setUnreadCounts,
  activeCallRef
}) {
  const [incomingInvite, setIncomingInvite] = useState(null);

  // Keep a ref to all the latest handlers so the WebSocket closure always sees the freshest functions
  const hRef = useRef({
    handleVideoSignaling,
    handleFileSignaling,
    cleanupCall,
    cleanupFileTransfer,
    initiateWebRTCCall,
    initiateFileWebRTCConnection,
    selectedFriendRef,
    receiverInviteIdRef,
    currentFileRef,
    setTransferState,
    setFriends,
    setMessages,
    toast,
    currentUser
  });

  useEffect(() => {
    hRef.current = {
      handleVideoSignaling,
      handleFileSignaling,
      cleanupCall,
      cleanupFileTransfer,
      initiateWebRTCCall,
      initiateFileWebRTCConnection,
      selectedFriendRef,
      receiverInviteIdRef,
      currentFileRef,
      setTransferState,
      setFriends,
      setMessages,
      toast,
      currentUser
    };
  });

  useEffect(() => {
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
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const isDev = window.location.port === '5173' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const signalingHost = isDev ? `${window.location.hostname}:3001` : window.location.host;
      wsUrl = `${protocol}//${signalingHost}?token=${authService.getToken()}`;
    }

    let socket = null;
    let isMounted = true;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;

    const connectWS = () => {
      if (!isMounted) return;
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[WS] Connected to signaling server.');
        reconnectAttempts = 0; 
        const friendNames = friendsRef.current
          .filter(f => f.status === 'accepted')
          .map(f => f.friendUserId);
        
        if (friendNames.length > 0) {
          socket.send(JSON.stringify({
            type: 'check-status',
            friends: friendNames
          }));
        }
      };

      socket.onmessage = async (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        console.log('[WS] Received message:', msg);
        
        const h = hRef.current;

        switch (msg.type) {
          case 'status-update': {
            h.setFriends((prev) => {
              let hasChanges = false;
              const next = prev.map((f) => {
                const cleanName = f.friendUserId.toLowerCase();
                if (msg.statuses[cleanName] !== undefined && f.isOnline !== msg.statuses[cleanName]) {
                  hasChanges = true;
                  return { ...f, isOnline: msg.statuses[cleanName] };
                }
                return f;
              });
              return hasChanges ? next : prev;
            });

            // If the user we are in an active call with goes offline, clean up the call!
            if (h.activeCallRef?.current) {
              const activeFriend = h.activeCallRef.current.friendUserId.toLowerCase();
              if (msg.statuses[activeFriend] === false) {
                h.toast.error('Call disconnected. Peer went offline.');
                h.cleanupCall();
              }
            }
            break;
          }

          case 'incoming-invite': {
            try {
              // Now, inviteMessage is always a stringified DB Activity!
              const activity = JSON.parse(msg.inviteMessage);
              const currentSelFriend = h.selectedFriendRef.current;
              
              if (currentSelFriend && msg.senderUserId.toLowerCase() === currentSelFriend.friendUserId.toLowerCase()) {
                // If they are on the chat, just push it into the active messages feed!
                h.receiverInviteIdRef.current = activity.id;
                h.setMessages((prev) => [...prev, activity]);
              } else {
                // If they are on a DIFFERENT chat, increment unread counts
                if (msg.mediaType === 'file' || msg.mediaType === 'video') {
                  if (h.setUnreadCounts) {
                    h.setUnreadCounts(prev => ({
                      ...prev,
                      [msg.senderUserId.toLowerCase()]: (prev[msg.senderUserId.toLowerCase()] || 0) + 1
                    }));
                  }
                }
              }
            } catch (e) {
              console.error('Failed to parse incoming invite metadata:', e);
            }
            break;
          }

          case 'invite-failed': {
            h.toast.error(msg.reason || 'Invitation failed.');
            h.cleanupCall();
            h.setTransferState(null);
            break;
          }

          case 'invite-response': {
            const isAccepted = msg.accepted;
            const responseMsgId = msg.messageId;

            if (responseMsgId) {
              h.setMessages((prev) =>
                prev.map((m) =>
                  m.id === responseMsgId
                    ? isAccepted
                      ? { ...m, metadata: { ...m.metadata, status: 'accepted' } }
                      : { ...m, type: 'text', content: 'File transfer invitation declined', metadata: null }
                    : m
                )
              );
            }

            if (isAccepted) {
              h.toast.success(`@${msg.senderUserId.toLowerCase()} accepted! Connecting...`);
              if (h.currentFileRef.current) {
                h.initiateFileWebRTCConnection(msg.senderUserId.toLowerCase(), true);
              } else {
                h.initiateWebRTCCall(msg.senderUserId.toLowerCase());
              }
            } else {
              h.toast.error(`@${msg.senderUserId.toLowerCase()} declined your invitation.`);
              h.cleanupCall();
              h.setTransferState(null);
              h.currentFileRef.current = null;
            }
            break;
          }

          case 'signal': {
            if (msg.data && msg.data.type === 'chat-message') {
              const currentSelFriend = h.selectedFriendRef.current;
              if (currentSelFriend && msg.fromUserId.toLowerCase() === currentSelFriend.friendUserId.toLowerCase()) {
                const newMsg = {
                  id: Math.random().toString(),
                  senderId: currentSelFriend.friendId,
                  receiverId: h.currentUser.id,
                  type: 'text',
                  content: msg.data.text,
                  createdAt: new Date().toISOString()
                };
                h.setMessages((prev) => [...prev, newMsg]);
              } else {
                // Not in active chat, increment unread count
                if (h.setUnreadCounts) {
                  h.setUnreadCounts(prev => ({
                    ...prev,
                    [msg.fromUserId.toLowerCase()]: (prev[msg.fromUserId.toLowerCase()] || 0) + 1
                  }));
                }
              }
            } else if (msg.data && msg.data.channelType === 'file') {
              h.handleFileSignaling(msg.fromUserId.toLowerCase(), msg.data);
            } else {
              h.handleVideoSignaling(msg.fromUserId.toLowerCase(), msg.data);
            }
            break;
          }

          case 'error': {
            h.toast.error(msg.message || 'Server error occurred.');
            break;
          }

          default:
            break;
        }
      };

      socket.onclose = () => {
        console.warn('[WS] Connection closed.');
        if (isMounted) {
           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
           reconnectAttempts++;
           reconnectTimeout = setTimeout(connectWS, delay);
        }
      };
    };

    connectWS();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
      if (hRef.current.cleanupCall) {
         hRef.current.cleanupCall();
         hRef.current.cleanupFileTransfer();
      }
    };
  }, [friendsRef]);

  return { wsRef, incomingInvite, setIncomingInvite };
}
