import { useState, useRef, useEffect } from 'react';
import { authService } from '../services/authService';

export function useWebRTCVideo({
  wsRef,
  setMessages,
  toast,
  iceServers,
  selectedFriendRef, // needed to know who the call is with for logging
  receiverInviteIdRef
}) {
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const activeCallRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const videoPendingCandidatesRef = useRef([]);
  const callInviteIdRef = useRef(null);

  // Keep ref in sync for synchronous access in WS handlers
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMicMuted(!micMuted);
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setCamOff(!camOff);
    }
  };

  const endCall = () => {
    const currentActiveCall = activeCallRef.current || activeCall;
    if (currentActiveCall && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'signal',
        targetUserId: currentActiveCall.friendUserId.toLowerCase(),
        data: { endCall: true }
      }));
    }
    cleanupCall();
    toast.success('Call ended.');
  };

  const cleanupCall = () => {
    toast.dismiss('call');

    // Log call duration
    const currentActiveCall = activeCallRef.current || activeCall;
    if (currentActiveCall && selectedFriendRef.current) {
      const isCaller = currentActiveCall.role === 'caller';
      const friendId = selectedFriendRef.current.friendId;
      let content = '';
      let metadata = { status: 'missed', duration: 0 };

      if (callStartTimeRef.current) {
        const durationSec = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        content = `Video Call - ${mins > 0 ? `${mins}m ` : ''}${secs}s`;
        metadata = { status: 'completed', duration: durationSec };
      } else {
        content = 'Missed Call';
      }

      if ((isCaller && callInviteIdRef.current) || (!isCaller && receiverInviteIdRef?.current)) {
        const inviteIdToPatch = isCaller ? callInviteIdRef.current : receiverInviteIdRef.current;
        authService.fetchAuth(`/api/activities/${inviteIdToPatch}`, {
          method: 'PATCH',
          body: JSON.stringify({
            type: 'video-call',
            content,
            metadata
          })
        }).then(res => res.json()).then(data => {
          if (data.ok && data.log) {
            setMessages(prev => prev.map(m => m.id === data.log.id ? data.log : m));
            if (isCaller && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'signal',
                targetUserId: selectedFriendRef.current.friendUserId.toLowerCase(),
                data: {
                  type: 'activity-sync',
                  activity: data.log
                }
              }));
            }
          }
        }).catch(err => console.error('Error logging call', err));
      }
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setMicMuted(false);
    setCamOff(false);
    callStartTimeRef.current = null;
    videoPendingCandidatesRef.current = [];
  };

  const sendCallInvite = async (inviteMsg = 'Incoming Video Call') => {
    const friend = selectedFriendRef.current;
    if (!friend || !friend.isOnline) {
      toast.error('Friend is offline.');
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Connecting to chat server, please wait...');
      return;
    }

    toast.loading('Calling friend...', { id: 'call' });
    setActiveCall({ friendUserId: friend.friendUserId.toLowerCase(), role: 'caller' });
    callStartTimeRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      setLocalStream(stream);
      localStreamRef.current = stream;
    } catch (err) {
      console.error('Failed to get local stream', err);
      toast.error('Could not access camera/microphone');
      cleanupCall();
      return;
    }

    try {
      const res = await authService.fetchAuth('/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: friend.friendId,
          type: 'call-invite',
          content: inviteMsg,
          metadata: { status: 'pending' }
        })
      });
      const data = await res.json();
      
      if (data.ok && data.log) {
        callInviteIdRef.current = data.log.id;
        setMessages(prev => [...prev, data.log]);
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'invite',
            targetUserId: friend.friendUserId.toLowerCase(),
            mediaType: 'video',
            inviteMessage: JSON.stringify(data.log)
          }));
        }
      } else {
        console.error('API rejected call invite:', data.message);
        toast.error(`Error: ${data.message || 'Failed to send call invite'}`);
        cleanupCall();
      }
    } catch (err) {
      console.error('Failed to log call invite', err);
      toast.error('Failed to send call invite');
      cleanupCall();
    }
  };

  const answerCall = async (targetUserId) => {
    setActiveCall({ friendUserId: targetUserId, role: 'receiver' });
    callStartTimeRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      setLocalStream(stream);
      localStreamRef.current = stream;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'invite-response',
          targetUserId,
          accepted: true,
          messageId: receiverInviteIdRef.current
        }));
      }
    } catch (err) {
      console.error('Failed to get local stream', err);
      toast.error('Could not access camera/microphone');
      cleanupCall();

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'invite-response',
          targetUserId,
          accepted: false
        }));
      }
    }
  };

  const initiateWebRTCCall = async (targetUserId) => {
    try {
      // Ensure activeCall is set in case state was lost (e.g. browser reload)
      setActiveCall({ friendUserId: targetUserId.toLowerCase(), role: 'caller' });

      let stream = localStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
        setLocalStream(stream);
        localStreamRef.current = stream;
      }

      const pc = new RTCPeerConnection(iceServers);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          console.warn('[WebRTC Video] Caller connection state:', pc.connectionState);
          cleanupCall();
          toast.error('Call disconnected.');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'signal',
            targetUserId: targetUserId.toLowerCase(),
            data: { candidate: event.candidate }
          }));
        }
      };

      pc.ontrack = (event) => {
        if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
        const [rStream] = event.streams;
        setRemoteStream(rStream);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          targetUserId: targetUserId.toLowerCase(),
          data: { sdp: offer }
        }));
      }

    } catch (err) {
      console.error('[WebRTC] Call Initiation Error:', err);
      toast.error('Failed to initialize WebRTC PeerConnection.');
      cleanupCall();
    }
  };

  const handleVideoSignaling = async (fromUserId, data) => {
    try {
      if (data.type === 'activity-sync') {
        setMessages(prev => prev.map(m => m.id === data.activity.id ? data.activity : m));
        return;
      }
      if (data.endCall) {
        toast.info('Call ended by peer');
        cleanupCall();
        return;
      }
      if (data.sdp) {
        const pc = pcRef.current;

        if (data.sdp.type === 'offer') {
          let stream = localStreamRef.current;
          if (!stream) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
            setLocalStream(stream);
            localStreamRef.current = stream;
          }

          const newPc = new RTCPeerConnection(iceServers);
          pcRef.current = newPc;

          stream.getTracks().forEach((track) => newPc.addTrack(track, stream));

          newPc.onconnectionstatechange = () => {
            if (['failed', 'closed', 'disconnected'].includes(newPc.connectionState)) {
              console.warn('[WebRTC Video] Receiver connection state:', newPc.connectionState);
              cleanupCall();
              toast.error('Call disconnected.');
            }
          };

          newPc.onicecandidate = (event) => {
            if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'signal',
                targetUserId: fromUserId.toLowerCase(),
                data: { candidate: event.candidate }
              }));
            }
          };

          newPc.ontrack = (event) => {
            if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
            const [rStream] = event.streams;
            setRemoteStream(rStream);
          };

          await newPc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          
          if (videoPendingCandidatesRef.current && videoPendingCandidatesRef.current.length > 0) {
            for (const cand of videoPendingCandidatesRef.current) {
              try {
                await newPc.addIceCandidate(cand);
              } catch (e) {
                console.warn('[WebRTC Video] Error adding pending candidate:', e);
              }
            }
            videoPendingCandidatesRef.current = [];
          }

          const answer = await newPc.createAnswer();
          await newPc.setLocalDescription(answer);

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'signal',
              targetUserId: fromUserId.toLowerCase(),
              data: { sdp: answer }
            }));
          }
        } else if (data.sdp.type === 'answer' && pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          
          if (videoPendingCandidatesRef.current && videoPendingCandidatesRef.current.length > 0) {
            for (const cand of videoPendingCandidatesRef.current) {
              try {
                await pc.addIceCandidate(cand);
              } catch (e) {
                console.warn('[WebRTC Video] Error adding pending candidate:', e);
              }
            }
            videoPendingCandidatesRef.current = [];
          }
        }
      } else if (data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate);
        const pc = pcRef.current;
        if (!pc || !pc.remoteDescription) {
          if (!videoPendingCandidatesRef.current) videoPendingCandidatesRef.current = [];
          videoPendingCandidatesRef.current.push(candidate);
        } else {
          await pc.addIceCandidate(candidate);
        }
      }
    } catch (err) {
      console.error('[WebRTC] Video Signaling error:', err);
    }
  };

  return {
    activeCall,
    localStream,
    remoteStream,
    micMuted,
    camOff,
    toggleMic,
    toggleCam,
    endCall,
    answerCall,
    sendCallInvite,
    initiateWebRTCCall,
    handleVideoSignaling,
    cleanupCall,
    activeCallRef
  };
}
