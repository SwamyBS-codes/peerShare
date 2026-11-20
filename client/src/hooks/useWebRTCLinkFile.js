/** Manages file transfers over WebRTC for temporary link-based sessions. */
import { useEffect, useRef, useState } from 'react';
import { FileWriter } from '../services/webrtc/fileWriter';
import { ChunkWriteQueue } from '../services/webrtc/chunkWriteQueue';

const CHUNK_SIZE = 16 * 1024;
const MAX_IN_FLIGHT_BYTES = 512 * 1024;
const MAX_QUEUED_BYTES = 1024 * 1024;

/** Exposes link-session file sending, receiving, cancellation, and signaling handlers. */
export function useWebRTCLinkFile({ wsRef, toast, iceServers }) {
  const [transferState, setTransferState] = useState(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0);
  const [transferFileName, setTransferFileName] = useState('');
  const [receivedFiles, setReceivedFiles] = useState([]);

  const sessionRef = useRef(null);
  const filePcRef = useRef(null);
  const fileChannelRef = useRef(null);
  const fileWriterRef = useRef(null);
  const completedDownloadsRef = useRef([]);
  const chunkQueueRef = useRef(null);
  const senderAckRef = useRef(null);
  const receivedBytesRef = useRef(0);
  const writtenBytesRef = useRef(0);
  const fileReaderRef = useRef(null);
  const cancelledRef = useRef(false);
  const pendingFileRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const expectedSizeRef = useRef(0);
  const expectedNameRef = useRef('');

  useEffect(() => () => {
    for (const { writer, url } of completedDownloadsRef.current) {
      URL.revokeObjectURL(url);
      void writer.cleanup();
    }
    completedDownloadsRef.current = [];
  }, []);

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
    senderAckRef.current = null;
    const queue = chunkQueueRef.current;
    queue?.fail(new Error('File transfer closed'));
    chunkQueueRef.current = null;
    if (fileWriterRef.current) {
      const writer = fileWriterRef.current;
      fileWriterRef.current = null;
      void (async () => {
        await queue?.whenIdle();
        await writer.cleanup();
      })();
    }
    filePcRef.current?.close();
    filePcRef.current = null;
    fileChannelRef.current?.close();
    fileChannelRef.current = null;
    receivedBytesRef.current = 0;
    writtenBytesRef.current = 0;
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

  /** Creates or reuses the file peer connection and negotiates its data channel. */
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
    channel.bufferedAmountLowThreshold = 64 * 1024;
    let flowStarted = false;

    channel.onopen = () => {
      const file = pendingFileRef.current;
      if (!file) {
        setTransferState('failed');
        return;
      }
      channel.send(JSON.stringify({ type: 'meta', name: file.name, size: file.size }));
      setTransferState('connecting');
    };

    channel.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      if (event.data === 'cancel') {
        cancelledRef.current = true;
        setTransferState('failed');
        toast.error('Peer cancelled the transfer');
        cleanupTransfer();
        resetUi();
        return;
      }

      try {
        const message = JSON.parse(event.data);
        if (message.type === 'flow-ready' && !flowStarted &&
            Number.isSafeInteger(message.windowBytes) && message.windowBytes > 0) {
          flowStarted = true;
          const file = pendingFileRef.current;
          if (!file) return;
          setTransferState('sending');
          streamFileChunks(channel, file, Math.min(message.windowBytes, MAX_IN_FLIGHT_BYTES));
        } else if (message.type === 'flow-ack') {
          senderAckRef.current?.(message.writtenBytes);
        }
      } catch (error) {
        console.warn('[Link file] Ignoring invalid transfer control message:', error);
      }
    };
  };

  /** Streams file slices and updates transfer progress as the channel drains. */
  const streamFileChunks = (channel, file, windowBytes) => {
    if (!Number.isSafeInteger(windowBytes) || windowBytes <= 0) {
      setTransferState('failed');
      return;
    }
    const chunkSize = CHUNK_SIZE;
    const reader = new FileReader();
    fileReaderRef.current = reader;
    let offset = 0;
    let acknowledgedBytes = 0;
    let waitingForAck = false;
    let completed = false;
    let lastTime = Date.now();
    let bytesInWindow = 0;

    const readSlice = (start) => {
      if (cancelledRef.current) return;
      if (start - acknowledgedBytes >= windowBytes) {
        waitingForAck = true;
        return;
      }
      reader.readAsArrayBuffer(file.slice(start, start + chunkSize));
    };

    const finishSending = () => {
      if (completed) return;
      completed = true;
      setTransferState('completed');
      toast.success(`Sent ${file.name}`);
      setTimeout(() => {
        resetUi();
        cleanupTransfer();
      }, 2000);
    };

    senderAckRef.current = (writtenBytes) => {
      if (!Number.isSafeInteger(writtenBytes) || writtenBytes < acknowledgedBytes || writtenBytes > offset) return;
      acknowledgedBytes = writtenBytes;
      const now = Date.now();
      const elapsed = now - lastTime;
      if (elapsed >= 500 || acknowledgedBytes === file.size) {
        setTransferProgress(Math.floor((acknowledgedBytes / Math.max(file.size, 1)) * 100));
        setTransferSpeed(Math.floor((bytesInWindow * 1000) / Math.max(elapsed, 1)));
        bytesInWindow = 0;
        lastTime = now;
      }

      if (waitingForAck && offset < file.size) {
        waitingForAck = false;
        readSlice(offset);
      } else if (offset >= file.size && acknowledgedBytes === file.size) {
        finishSending();
      }
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

      if (offset < file.size) {
        if (channel.bufferedAmount > 64 * 1024) {
          channel.onbufferedamountlow = () => {
            channel.onbufferedamountlow = null;
            readSlice(offset);
          };
        } else {
          setTimeout(() => readSlice(offset), 0);
        }
      } else if (acknowledgedBytes === file.size) {
        finishSending();
      }
    };

    readSlice(0);
  };

  const setupReceiverChannel = (channel) => {
    channel.binaryType = 'arraybuffer';
    receivedBytesRef.current = 0;
    writtenBytesRef.current = 0;
    let receiverFailed = false;
    let writerReady = false;
    let channelOpen = false;
    let readySent = false;

    let lastTime = Date.now();
    let bytesInWindow = 0;

    const failReceiver = async (error) => {
      if (receiverFailed) return;
      receiverFailed = true;
      console.error('[Link file] Receiver write failed:', error);
      setTransferState('failed');
      toast.error('Could not save the received file. The transfer was stopped.');
      chunkQueueRef.current?.fail(error);
      if (channel.readyState === 'open') {
        try {
          channel.send('cancel');
        } catch (sendError) {
          console.warn('[Link file] Failed to notify sender of write failure:', sendError);
        }
      }
      const writer = fileWriterRef.current;
      await chunkQueueRef.current?.whenIdle();
      await writer?.cleanup();
      fileWriterRef.current = null;
      chunkQueueRef.current = null;
    };

    const finishReceiving = async () => {
      try {
        await fileWriterRef.current.close();
        const fileBlob = await fileWriterRef.current.getFileBlob();
        const url = URL.createObjectURL(fileBlob);
        const name = expectedNameRef.current || 'download';
        completedDownloadsRef.current.push({ writer: fileWriterRef.current, url });
        fileWriterRef.current = null;
        chunkQueueRef.current = null;
        setReceivedFiles((prev) => [{ id: `${Date.now()}`, name, size: fileBlob.size, url }, ...prev]);
        setTransferState('completed');
        toast.success(`Received ${name}`);
        setTimeout(() => {
          resetUi();
          cleanupTransfer();
        }, 2500);
      } catch (error) {
        await failReceiver(error);
      }
    };

    const announceReady = () => {
      if (!readySent && channelOpen && writerReady && channel.readyState === 'open') {
        readySent = true;
        try {
          channel.send(JSON.stringify({ type: 'flow-ready', windowBytes: MAX_IN_FLIGHT_BYTES }));
          setTransferState('receiving');
        } catch (error) {
          void failReceiver(error);
        }
      }
    };

    channel.onopen = () => {
      channelOpen = true;
      announceReady();
    };

    channel.onmessage = async (event) => {
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
            if (!Number.isSafeInteger(parsed.size) || parsed.size < 0) {
              await failReceiver(new Error('Invalid incoming file size'));
              return;
            }
            expectedSizeRef.current = parsed.size;
            setTransferFileName(parsed.name || 'download');
            const writer = new FileWriter(
              `link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              expectedNameRef.current,
              expectedSizeRef.current,
              'application/octet-stream'
            );
            fileWriterRef.current = writer;
            try {
              await writer.init();
              if (writer.type === 'ram') {
                throw new Error('Persistent browser storage is unavailable');
              }
              chunkQueueRef.current = new ChunkWriteQueue(
                (offset, data) => writer.write(offset, data),
                MAX_QUEUED_BYTES
              );
              writerReady = true;
              announceReady();
            } catch (error) {
              await failReceiver(error);
            }
          }
        } catch (error) {
          console.warn('[Link file] Ignoring invalid metadata message:', error);
        }
        return;
      }

      if (receiverFailed || !chunkQueueRef.current) return;
      const buffer = event.data;
      const total = expectedSizeRef.current;
      if (!(buffer instanceof ArrayBuffer) || receivedBytesRef.current + buffer.byteLength > total) {
        await failReceiver(new Error('Received data exceeds the advertised file size'));
        return;
      }

      const offset = receivedBytesRef.current;
      receivedBytesRef.current += buffer.byteLength;
      try {
        await chunkQueueRef.current.enqueue(offset, buffer);
      } catch (error) {
        await failReceiver(error);
        return;
      }

      writtenBytesRef.current = offset + buffer.byteLength;
      bytesInWindow += buffer.byteLength;
      const now = Date.now();
      const elapsed = now - lastTime;
      if (elapsed >= 500 || writtenBytesRef.current === total) {
        setTransferProgress(Math.floor((writtenBytesRef.current / Math.max(total, 1)) * 100));
        setTransferSpeed(Math.floor((bytesInWindow * 1000) / Math.max(elapsed, 1)));
        bytesInWindow = 0;
        lastTime = now;
      }
      if (channel.readyState === 'open') {
        try {
          channel.send(JSON.stringify({ type: 'flow-ack', writtenBytes: writtenBytesRef.current }));
        } catch (error) {
          await failReceiver(error);
          return;
        }
      }

      if (writtenBytesRef.current === total) {
        await finishReceiving();
      }
    };
  };

  /** Applies link-session SDP and ICE messages, buffering early candidates. */
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
