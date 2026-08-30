import { useState, useRef } from 'react';
import { authService } from '../services/authService';

export function useWebRTCFile({
  wsRef,
  setMessages,
  toast,
  iceServers,
  selectedFriendRef
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0);
  const [transferState, setTransferState] = useState(null);
  const [transferFileName, setTransferFileName] = useState('');
  const [transferFileSize, setTransferFileSize] = useState(0);

  const filePcRef = useRef(null);
  const fileChannelRef = useRef(null);
  const fileChunksRef = useRef([]);
  const receivedBytesRef = useRef(0);
  const fileReaderRef = useRef(null);
  const fileTransferCancelledRef = useRef(false);
  const currentFileRef = useRef(null);
  const fileNoteRef = useRef('');
  const transferFileNameRef = useRef('');
  const transferFileSizeRef = useRef(0);
  const fileInviteIdRef = useRef(null);
  const receiverInviteIdRef = useRef(null);
  const filePendingCandidatesRef = useRef([]);

  // Utility to format file size inline to avoid missing dependency
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const setTransferFileNameWithRef = (name) => {
    transferFileNameRef.current = name;
    setTransferFileName(name);
  };

  const setTransferFileSizeWithRef = (size) => {
    transferFileSizeRef.current = size;
    setTransferFileSize(size);
  };

  const cleanupFileTransfer = () => {
    if (filePcRef.current) {
      filePcRef.current.close();
      filePcRef.current = null;
    }
    if (fileChannelRef.current) {
      fileChannelRef.current.close();
      fileChannelRef.current = null;
    }
    fileChunksRef.current = [];
    receivedBytesRef.current = 0;
    currentFileRef.current = null;
    fileNoteRef.current = '';
    fileInviteIdRef.current = null;
    receiverInviteIdRef.current = null;
    if (fileReaderRef.current) {
      fileReaderRef.current.abort();
      fileReaderRef.current = null;
    }
    setSelectedFile(null);
  };

  const cancelFileTransfer = async () => {
    fileTransferCancelledRef.current = true;
    if (fileChannelRef.current && fileChannelRef.current.readyState === 'open') {
      fileChannelRef.current.send('cancel');
    }
    setTransferState('failed');
    toast.error('File transfer cancelled');

    const failMsg = `Failed to transfer file: ${transferFileName} - cancelled`;

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
      );

      try {
        await authService.fetchAuth(`/api/activities/${fileInviteIdRef.current}`, {
          method: 'PATCH',
          body: JSON.stringify({
            type: 'file',
            content: failMsg,
            metadata: {
              name: transferFileName,
              size: transferFileSize,
              note: fileNoteRef.current,
              status: 'failed'
            }
          })
        });
      } catch (err) {
        console.error('Failed to log cancel in DB:', err);
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
      );
    }

    setTimeout(() => {
      setTransferState(null);
      cleanupFileTransfer();
    }, 1500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      currentFileRef.current = file;
      toast.success(`Attached: ${file.name}`);
    }
  };

  const handleAcceptInlineFileInvite = (msgId, senderUserId, name, size, note) => {
    receiverInviteIdRef.current = msgId;

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'invite-response',
        targetUserId: senderUserId.toLowerCase(),
        accepted: true,
        messageId: msgId
      }));
    }

    setTransferFileNameWithRef(name);
    setTransferFileSizeWithRef(size);
    fileNoteRef.current = note || '';
    setTransferState('connecting');
    setTransferProgress(0);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, metadata: { ...m.metadata, status: 'accepted' } }
          : m
      )
    );

    initiateFileWebRTCConnection(senderUserId.toLowerCase(), false);
  };

  const handleDeclineInlineFileInvite = (msgId, senderUserId) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'invite-response',
        targetUserId: senderUserId.toLowerCase(),
        accepted: false,
        messageId: msgId
      }));
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, type: 'text', content: 'Declined file transfer request', metadata: null }
          : m
      )
    );
  };

  const initiateFileWebRTCConnection = async (targetUserId, isInitiator) => {
    try {
      fileTransferCancelledRef.current = false;
      const pc = new RTCPeerConnection(iceServers);
      filePcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'signal',
            targetUserId: targetUserId.toLowerCase(),
            data: { candidate: event.candidate, channelType: 'file' }
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          setTransferState('failed');
          cleanupFileTransfer();
        }
      };

      if (isInitiator) {
        const channel = pc.createDataChannel('chat-file-transfer', { ordered: true });
        fileChannelRef.current = channel;
        setupSenderDataChannel(channel, targetUserId);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'signal',
            targetUserId: targetUserId.toLowerCase(),
            data: { sdp: offer, channelType: 'file' }
          }));
        }
      } else {
        pc.ondatachannel = (event) => {
          const channel = event.channel;
          if (channel.label === 'chat-file-transfer') {
            fileChannelRef.current = channel;
            setupReceiverDataChannel(channel);
          }
        };
      }
    } catch (err) {
      console.error('[WebRTC File] Connection Error:', err);
      setTransferState('failed');
      cleanupFileTransfer();
    }
  };

  const setupSenderDataChannel = (channel, targetUserId) => {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      setTransferState('sending');
      startSendingFileChunks(channel, targetUserId);
    };

    channel.onclose = () => {
      console.log('[WebRTC File] Data channel closed');
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        if (event.data === 'cancel') {
          fileTransferCancelledRef.current = true;
          setTransferState('failed');
          toast.error('Recipient cancelled the transfer');
          cleanupFileTransfer();
        }
      }
    };
  };

  const startSendingFileChunks = async (channel, targetUserId) => {
    const file = currentFileRef.current;
    if (!file) {
      setTransferState('failed');
      return;
    }

    const chunkSize = 16 * 1024;
    const fileReader = new FileReader();
    fileReaderRef.current = fileReader;
    let offset = 0;
    let lastTime = Date.now();
    let bytesSentInInterval = 0;

    const readSlice = (o) => {
      if (fileTransferCancelledRef.current) return;
      const slice = file.slice(o, o + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };

    fileReader.onload = async (e) => {
      if (fileTransferCancelledRef.current) return;
      const buffer = e.target.result;

      try {
        channel.send(buffer);
      } catch (err) {
        console.error('[WebRTC File] Send chunk error:', err);
        setTransferState('failed');
        cleanupFileTransfer();
        return;
      }

      offset += buffer.byteLength;
      bytesSentInInterval += buffer.byteLength;

      const now = Date.now();
      const elapsed = now - lastTime;
      if (elapsed >= 500 || offset >= file.size) {
        const pct = Math.floor((offset / file.size) * 100);
        setTransferProgress(pct);
        setTransferSpeed(Math.floor((bytesSentInInterval * 1000) / elapsed));
        bytesSentInInterval = 0;
        lastTime = now;
      }

      if (offset < file.size) {
        if (channel.bufferedAmount > 64 * 1024) {
          channel.onbufferedamountlow = () => {
            channel.onbufferedamountlow = null;
            readSlice(offset);
          };
        } else {
          setTimeout(() => readSlice(offset), 0);
        }
      } else {
        setTransferState('completed');

        const contentMsg = `Sent file: ${file.name} (${formatSize(file.size)})${fileNoteRef.current ? ` - "${fileNoteRef.current}"` : ''}`;

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
        );

        try {
          await authService.fetchAuth(`/api/activities/${fileInviteIdRef.current}`, {
            method: 'PATCH',
            body: JSON.stringify({
              type: 'file',
              content: contentMsg,
              metadata: {
                name: file.name,
                size: file.size,
                note: fileNoteRef.current,
                status: 'completed'
              }
            })
          });
        } catch (err) {
          console.error('Failed to log message in DB:', err);
        }

        setTimeout(() => {
          setTransferState(null);
          cleanupFileTransfer();
        }, 3000);
      }
    };

    readSlice(0);
  };

  const setupReceiverDataChannel = (channel) => {
    channel.binaryType = 'arraybuffer';
    fileChunksRef.current = [];
    receivedBytesRef.current = 0;
    setTransferState('receiving');
    let lastTime = Date.now();
    let bytesReceivedInInterval = 0;

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        if (event.data === 'cancel') {
          fileTransferCancelledRef.current = true;
          setTransferState('failed');
          toast.error('Sender cancelled the transfer');

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
            );
          }
          cleanupFileTransfer();
        }
        return;
      }

      const buffer = event.data;
      fileChunksRef.current.push(buffer);
      receivedBytesRef.current += buffer.byteLength;
      bytesReceivedInInterval += buffer.byteLength;

      const totalSize = transferFileSizeRef.current || 1;
      const now = Date.now();
      const elapsed = now - lastTime;
      if (elapsed >= 500 || receivedBytesRef.current >= totalSize) {
        const pct = Math.floor((receivedBytesRef.current / totalSize) * 100);
        setTransferProgress(pct);
        setTransferSpeed(Math.floor((bytesReceivedInInterval * 1000) / elapsed));
        bytesReceivedInInterval = 0;
        lastTime = now;
      }

      if (receivedBytesRef.current >= totalSize) {
        setTransferState('completed');

        const blob = new Blob(fileChunksRef.current);
        const downloadUrl = URL.createObjectURL(blob);
        const capturedFileName = transferFileNameRef.current;
        const capturedFileSize = transferFileSizeRef.current;

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
        );

        setTimeout(() => {
          setTransferState(null);
          cleanupFileTransfer();
        }, 4000);
      }
    };

    channel.onclose = () => {
      console.log('[WebRTC File] Receiver data channel closed');
    };
  };

  const handleFileSignaling = async (fromUserId, data) => {
    try {
      const pc = filePcRef.current;
      if (data.sdp) {
        if (data.sdp.type === 'offer') {
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            if (filePendingCandidatesRef.current && filePendingCandidatesRef.current.length > 0) {
              for (const cand of filePendingCandidatesRef.current) {
                try { await pc.addIceCandidate(cand); } catch (e) { }
              }
              filePendingCandidatesRef.current = [];
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (wsRef.current) {
              wsRef.current.send(JSON.stringify({
                type: 'signal',
                targetUserId: fromUserId.toLowerCase(),
                data: { sdp: answer, channelType: 'file' }
              }));
            }
          }
        } else if (data.sdp.type === 'answer' && pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          if (filePendingCandidatesRef.current && filePendingCandidatesRef.current.length > 0) {
            for (const cand of filePendingCandidatesRef.current) {
              try { await pc.addIceCandidate(cand); } catch (e) { }
            }
            filePendingCandidatesRef.current = [];
          }
        }
      } else if (data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate);
        if (!pc || !pc.remoteDescription) {
          if (!filePendingCandidatesRef.current) filePendingCandidatesRef.current = [];
          filePendingCandidatesRef.current.push(candidate);
        } else {
          await pc.addIceCandidate(candidate);
        }
      }
    } catch (err) {
      console.error('[WebRTC File] Signal Error:', err);
      setTransferState('failed');
      cleanupFileTransfer();
    }
  };

  return {
    selectedFile,
    setSelectedFile,
    transferState,
    setTransferState,
    transferProgress,
    transferSpeed,
    transferFileName,
    setTransferFileName: setTransferFileNameWithRef,
    transferFileSize,
    setTransferFileSize: setTransferFileSizeWithRef,
    fileNoteRef,
    currentFileRef,
    fileInviteIdRef,
    receiverInviteIdRef,
    cancelFileTransfer,
    cleanupFileTransfer,
    handleFileChange,
    handleAcceptInlineFileInvite,
    handleDeclineInlineFileInvite,
    initiateFileWebRTCConnection,
    handleFileSignaling
  };
}
