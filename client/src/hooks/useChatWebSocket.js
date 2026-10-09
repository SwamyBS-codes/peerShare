import { useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService';
import { mergeDeliveryMetadata } from '../utils/messageDelivery';

export function useChatWebSocket({
  wsRef,
  currentUser,
  friendsRef,
  setFriends,
  setMessages,
  toast,
  handleVideoSignaling,
  handleFileSignaling,
  handleGroupSignaling,
  handleGroupCallResponse,
  cleanupCall,
  cleanupFileTransfer,
  cleanupGroupCall,
  initiateWebRTCCall,
  initiateFileWebRTCConnection,
  selectedFriendRef,
  receiverInviteIdRef,
  currentFileRef,
  setTransferState,
  setUnreadCounts,
  activeCallRef,
  clearInviteExpiry,
  linkEventsRef,
}) {
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [incomingGroupCall, setIncomingGroupCall] = useState(null);
  const [incomingPeerInvite, setIncomingPeerInvite] = useState(null);

  // Keep a ref to all the latest handlers so the WebSocket closure always sees the freshest functions
  const hRef = useRef({
    handleVideoSignaling,
    handleFileSignaling,
    handleGroupSignaling,
    handleGroupCallResponse,
    cleanupCall,
    cleanupGroupCall,
    cleanupFileTransfer,
    initiateWebRTCCall,
    initiateFileWebRTCConnection,
    selectedFriendRef,
    receiverInviteIdRef,
    currentFileRef,
    setTransferState,
    setFriends,
    setMessages,
    setUnreadCounts,
    toast,
    currentUser,
    activeCallRef,
    clearInviteExpiry,
    setIncomingGroupCall,
    setIncomingPeerInvite,
    linkEventsRef,
  });

  useEffect(() => {
    hRef.current = {
      handleVideoSignaling,
      handleFileSignaling,
      handleGroupSignaling,
      handleGroupCallResponse,
      cleanupCall,
      cleanupGroupCall,
      cleanupFileTransfer,
      initiateWebRTCCall,
      initiateFileWebRTCConnection,
      selectedFriendRef,
      receiverInviteIdRef,
      currentFileRef,
      setTransferState,
      setFriends,
      setMessages,
      setUnreadCounts,
      toast,
      currentUser,
      activeCallRef,
      clearInviteExpiry,
      setIncomingGroupCall,
      setIncomingPeerInvite,
      linkEventsRef,
    };
  });

  useEffect(() => {
    // No audio autoplay for calls; keep the app quiet unless the user explicitly interacts.
  }, []);

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
    let presenceInterval = null;

    const requestPresence = () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const friendNames = friendsRef.current
        .filter((friend) => friend.status === 'accepted')
        .map((friend) => friend.friendUserId);
      if (friendNames.length > 0) {
        socket.send(JSON.stringify({ type: 'check-status', friends: friendNames }));
      }
    };

    const connectWS = () => {
      if (!isMounted) return;
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[WS] Connected to signaling server.');
        reconnectAttempts = 0; 
        requestPresence();
        // Presence broadcasts can be missed while the friend list is still loading.
        // Polling keeps both clients in sync after reconnects and browser wake-ups.
        if (presenceInterval) clearInterval(presenceInterval);
        presenceInterval = setInterval(requestPresence, 10_000);
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
                const cleanName = (f.friendUserId || '').trim().toLowerCase();
                const nextStatus = Object.entries(msg.statuses || {}).find(([key]) => key.trim().toLowerCase() === cleanName)?.[1];

                if (nextStatus !== undefined && f.isOnline !== Boolean(nextStatus)) {
                  hasChanges = true;
                  return { ...f, isOnline: Boolean(nextStatus) };
                }

                return f;
              });
              return hasChanges ? next : prev;
            });

            // If the user we are in an active call with goes offline, clean up the call!
            if (h.activeCallRef?.current) {
              const activeFriend = h.activeCallRef.current.friendUserId.toLowerCase();
              const activeStatus = Object.entries(msg.statuses || {}).find(([key]) => key.trim().toLowerCase() === activeFriend)?.[1];
              if (activeStatus === false) {
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
              const sender = msg.senderUserId.toLowerCase();
              const inActiveChat =
                currentSelFriend && sender === currentSelFriend.friendUserId.toLowerCase();

              if (!inActiveChat) {
                h.setIncomingPeerInvite?.({
                  senderUserId: sender,
                  mediaType: msg.mediaType || 'video',
                  activity,
                });
              }

              if (inActiveChat) {
                h.receiverInviteIdRef.current = activity.id;
                h.setMessages((prev) => {
                  if (prev.some((m) => m.id === activity.id)) return prev;
                  return [...prev, activity];
                });
              } else if (h.setUnreadCounts) {
                h.setUnreadCounts((prev) => ({
                  ...prev,
                  [sender]: (prev[sender] || 0) + 1,
                }));
              }

              if (!inActiveChat) {
                if (msg.mediaType === 'file') {
                  h.toast(`@${sender} sent you a file`, { icon: '📁' });
                } else if (msg.mediaType === 'audio') {
                  h.toast(`Incoming voice call from @${sender}`, { icon: '📞' });
                } else {
                  h.toast(`Incoming video call from @${sender}`, { icon: '📹' });
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
              h.clearInviteExpiry?.();
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

          case 'invite-cancelled': {
            if (msg.messageId) {
              h.setMessages((prev) => prev.filter((message) => message.id !== msg.messageId));
            }
            h.setIncomingPeerInvite?.((prev) =>
              prev?.activity?.id === msg.messageId ? null : prev,
            );
            break;
          }

          case 'signal': {
            if (msg.data && msg.data.type === 'chat-message') {
              const currentSelFriend = h.selectedFriendRef.current;
              const fromPeer = msg.fromUserId.toLowerCase();
              const inActiveChat =
                currentSelFriend && fromPeer === currentSelFriend.friendUserId.toLowerCase();

              const sendDelivery = (status) => {
                if (!socket || socket.readyState !== WebSocket.OPEN || !msg.data.clientMessageId) return;
                socket.send(
                  JSON.stringify({
                    type: 'signal',
                    targetUserId: fromPeer,
                    data: {
                      type: 'message-delivery',
                      clientMessageId: msg.data.clientMessageId,
                      status,
                    },
                  }),
                );
              };

              if (inActiveChat) {
                const newMsg = {
                  id: msg.data.clientMessageId || Math.random().toString(),
                  senderId: currentSelFriend.friendId,
                  receiverId: h.currentUser.id,
                  type: 'text',
                  content: msg.data.text,
                  createdAt: new Date().toISOString(),
                };
                h.setMessages((prev) => [...prev, newMsg]);
                sendDelivery('delivered');
                sendDelivery('read');
              } else {
                sendDelivery('delivered');
                if (h.setUnreadCounts) {
                  h.setUnreadCounts((prev) => ({
                    ...prev,
                    [fromPeer]: (prev[fromPeer] || 0) + 1,
                  }));
                }
              }
            } else if (msg.data && msg.data.type === 'message-delivery') {
              const { clientMessageId, status } = msg.data;
              if (!clientMessageId || !status) break;
              h.setMessages((prev) =>
                prev.map((m) => {
                  const metaId = m.metadata?.clientMessageId;
                  const matches = m.id === clientMessageId || metaId === clientMessageId;
                  if (!matches) return m;
                  const current = m.metadata?.deliveryStatus;
                  const rank = { sending: 0, sent: 1, delivered: 2, read: 3, failed: -1 };
                  if (rank[current] >= rank[status]) return m;
                  return mergeDeliveryMetadata(m, status);
                }),
              );
            } else if (msg.data && msg.data.channelType === 'file') {
              h.handleFileSignaling(msg.fromUserId.toLowerCase(), msg.data);
            } else {
              h.handleVideoSignaling(msg.fromUserId.toLowerCase(), msg.data);
            }
            break;
          }

          case 'incoming-group-call': {
            h.setIncomingGroupCall?.({
              hostUserId: msg.hostUserId,
              groupId: msg.groupId,
              groupName: msg.groupName,
              mediaType: msg.mediaType || 'video',
              members: msg.members || [],
            });
            break;
          }

          case 'group-call-response': {
            h.handleGroupCallResponse?.(
              msg.fromUserId,
              msg.groupId,
              Boolean(msg.accepted),
            );
            break;
          }

          case 'group-signal': {
            h.handleGroupSignaling?.(msg.fromUserId, msg.groupId, msg.data);
            break;
          }

          case 'link-created': {
            h.linkEventsRef?.current?.onCreated?.(msg.code);
            break;
          }

          case 'link-connected': {
            h.linkEventsRef?.current?.onConnected?.({
              code: msg.code,
              role: msg.role,
              peerUserId: msg.peerUserId,
            });
            break;
          }

          case 'link-error': {
            h.linkEventsRef?.current?.onError?.(msg.message);
            h.toast.error(msg.message || 'Link session error');
            break;
          }

          case 'link-closed':
          case 'link-peer-left': {
            h.linkEventsRef?.current?.onClosed?.(msg);
            break;
          }

          case 'link-signal': {
            if (msg.data?.channelType === 'file') {
              h.linkEventsRef?.current?.onFileSignal?.(msg.fromUserId, msg.data);
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
        if (presenceInterval) {
          clearInterval(presenceInterval);
          presenceInterval = null;
        }
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
      if (socket) socket.close();
      if (hRef.current.cleanupCall) {
         hRef.current.cleanupCall();
         hRef.current.cleanupFileTransfer();
         hRef.current.cleanupGroupCall?.();
      }
    };
  }, [friendsRef]);

  return {
    wsRef,
    incomingInvite,
    setIncomingInvite,
    incomingGroupCall,
    setIncomingGroupCall,
    incomingPeerInvite,
    setIncomingPeerInvite,
  };
}
