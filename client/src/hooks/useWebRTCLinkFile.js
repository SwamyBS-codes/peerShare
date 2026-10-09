import { useRef, useState } from 'react';

export function useWebRTCLinkFile({ wsRef, toast, iceServers }) {
  const [transferState, setTransferState] = useState(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0);
  const [transferFileName, setTransferFileName] = useState('');
  const [receivedFiles, setReceivedFiles] = useState([]);

  const sessionRef = useRef(null);
  const filePcRef = useRef(null);
  const fileChannelRef = useRef(null);
  const fileChunksRef = useRef([]);
  const receivedBytesRef = useRef(0);
  const fileReaderRef = useRef(null);
  const cancelledRef = useRef(false);
  const pendingFileRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const expectedSizeRef = useRef(0);
  const expectedNameRef = useRef('');

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const setSession = (session) => {
    sessionRef.current = session;
  };

  const sendLinkSignal = (data) => {
    const session = sessionRef.current;
    if (!session?.code || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'link-signal',
        code: session.code,
        data: { ...data, channelType: 'file' },
      }),
    );
  };

  const cleanupTransfer = () => {
    filePcRef.current?.close();
    filePcRef.current = null;
    fileChannelRef.current?.close();
    fileChannelRef.current = null;
    fileChunksRef.current = [];
    receivedBytesRef.current = 0;
    pendingFileRef.current = null;
    pendingCandidatesRef.current = [];
    expectedSizeRef.current = 0;
    expectedNameRef.current = '';
    if (fileReaderRef.current) {
      fileReaderRef.current.abort();
      fileReaderRef.current = null;
    }
  };

  const resetUi = () => {
    setTransferState(null);
    setTransferProgress(0);
    setTransferSpeed(0);
    setTransferFileName('');
  };

  const cancelTransfer = () => {
    cancelledRef.current = true;
    if (fileChannelRef.current?.readyState === 'open') {
      try {
        fileChannelRef.current.send('cancel');
      } catch {
        /* ignore */
      }
    }
    setTransferState('failed');
    toast.error('Transfer cancelled');
    setTimeout(() => {
      resetUi();
      cleanupTransfer();
    }, 1200);
  };

  const ensurePeerConnection = async (isInitiator) => {
    if (filePcRef.current) return filePcRef.current;

    cancelledRef.current = false;
    const pc = new RTCPeerConnection(iceServers);
    filePcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) sendLinkSignal({ candidate: event.candidate });
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        if (transferState && transferState !== 'completed') {
          setTransferState('failed');
          toast.error('Peer connection lost');
        }
        cleanupTransfer();
        resetUi();
      }
    };

    if (isInitiator) {
      const channel = pc.createDataChannel('link-file-transfer', { ordered: true });
      fileChannelRef.current = channel;
      setupSenderChannel(channel);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendLinkSignal({ sdp: offer });
    } else {
      pc.ondatachannel = (event) => {
        if (event.channel.label === 'link-file-transfer') {
          fileChannelRef.current = event.channel;
          setupReceiverChannel(event.channel);
        }
      };
    }

    return pc;
  };

  const sendFile = async (file) => {
    if (!sessionRef.current?.peerUserId || !file) return;
    if (transferState && ['connecting', 'sending', 'receiving'].includes(transferState)) {
      toast.error('Wait for the current transfer to finish.');
      return;
    }

    pendingFileRef.current = file;
    setTransferFileName(file.name);
    setTransferProgress(0);
    setTransferState('connecting');
    await ensurePeerConnection(true);
  };

  const setupSenderChannel = (channel) => {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      const file = pendingFileRef.current;
      if (!file) {
        setTransferState('failed');
        return;
      }
      setTransferState('sending');
      channel.send(JSON.stringify({ type: 'meta', name: file.name, size: file.size }));
      streamFileChunks(channel, file);
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string' && event.data === 'cancel') {
        cancelledRef.current = true;
        setTransferState('failed');
        toast.error('Peer cancelled the transfer');
        cleanupTransfer();
        resetUi();
      }
    };
  };

  const streamFileChunks = (channel, file) => {
    const chunkSize = 16 * 1024;
    const reader = new FileReader();
    fileReaderRef.current = reader;
    let offset = 0;
    let lastTime = Date.now();
    let bytesInWindow = 0;

    const readSlice = (start) => {
      if (cancelledRef.current) return;
      reader.readAsArrayBuffer(file.slice(start, start + chunkSize));
    };

    reader.onload = (e) => {
      if (cancelledRef.current) return;
      const buffer = e.target.result;
      try {
        channel.send(buffer);
      } catch {
        setTransferState('failed');
        cleanupTransfer();
        resetUi();
        return;
      }

      offset += buffer.byteLength;
      bytesInWindow += buffer.byteLength;
      const now = Date.now();
      const elapsed = now - lastTime;
      if (elapsed >= 500 || offset >= file.size) {
        setTransferProgress(Math.floor((offset / file.size) * 100));
        setTransferSpeed(Math.floor((bytesInWindow * 1000) / Math.max(elapsed, 1)));
        bytesInWindow = 0;
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
        toast.success(`Sent ${file.name}`);
        setTimeout(() => {
          resetUi();
          cleanupTransfer();
        }, 2000);
      }
    };

    readSlice(0);
  };

  const setupReceiverChannel = (channel) => {
    channel.binaryType = 'arraybuffer';
    fileChunksRef.current = [];
    receivedBytesRef.current = 0;
    setTransferState('receiving');

    let lastTime = Date.now();
    let bytesInWindow = 0;

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        if (event.data === 'cancel') {
          setTransferState('failed');
          toast.error('Sender cancelled');
          cleanupTransfer();
          resetUi();
          return;
        }
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'meta') {
            expectedNameRef.current = parsed.name || 'download';
            expectedSizeRef.current = parsed.size || 0;
            setTransferFileName(parsed.name || 'download');
          }
        } catch {
          /* ignore */
        }
        return;
      }

      fileChunksRef.current.push(event.data);
      receivedBytesRef.current += event.data.byteLength;
      bytesInWindow += event.data.byteLength;

      const total = expectedSizeRef.current || 1;
      const now = Date.now();
      const elapsed = now - lastTime;
      if (elapsed >= 500 || receivedBytesRef.current >= total) {
        setTransferProgress(Math.floor((receivedBytesRef.current / total) * 100));
        setTransferSpeed(Math.floor((bytesInWindow * 1000) / Math.max(elapsed, 1)));
        bytesInWindow = 0;
        lastTime = now;
      }

      if (expectedSizeRef.current && receivedBytesRef.current >= expectedSizeRef.current) {
        const blob = new Blob(fileChunksRef.current);
        const url = URL.createObjectURL(blob);
        const name = expectedNameRef.current || 'download';
        setReceivedFiles((prev) => [{ id: `${Date.now()}`, name, size: blob.size, url }, ...prev]);
        setTransferState('completed');
        toast.success(`Received ${name}`);
        setTimeout(() => {
          resetUi();
          cleanupTransfer();
        }, 2500);
      }
    };
  };

  const handleLinkFileSignaling = async (_fromUserId, data) => {
    try {
      let pc = filePcRef.current;

      if (data.sdp?.type === 'offer') {
        if (!pc) {
          await ensurePeerConnection(false);
          pc = filePcRef.current;
        }
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const cand of pendingCandidatesRef.current) {
          try {
            await pc.addIceCandidate(cand);
          } catch {
            /* ignore */
          }
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendLinkSignal({ sdp: answer });
        return;
      }

      if (data.sdp?.type === 'answer' && pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const cand of pendingCandidatesRef.current) {
          try {
            await pc.addIceCandidate(cand);
          } catch {
            /* ignore */
          }
        }
        pendingCandidatesRef.current = [];
        return;
      }

      if (data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate);
        if (!pc || !pc.remoteDescription) {
          pendingCandidatesRef.current.push(candidate);
        } else {
          await pc.addIceCandidate(candidate);
        }
      }
    } catch (err) {
      console.error('[Link file] signaling error', err);
      setTransferState('failed');
      cleanupTransfer();
      resetUi();
    }
  };

  return {
    setSession,
    sendFile,
    cancelTransfer,
    handleLinkFileSignaling,
    transferState,
    transferProgress,
    transferSpeed,
    transferFileName,
    receivedFiles,
    formatSize,
    cleanupTransfer,
  };
}
