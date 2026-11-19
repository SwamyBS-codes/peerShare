/** Manages one-to-one WebRTC file-transfer state, signaling, and chunk delivery. */
import { useState, useRef, useEffect } from 'react';
import { authService } from '../services/authService';
import { FileWriter } from '../services/webrtc/fileWriter';
import { ChunkWriteQueue } from '../services/webrtc/chunkWriteQueue';

const CHUNK_SIZE = 16 * 1024;
const MAX_IN_FLIGHT_BYTES = 512 * 1024;
const MAX_QUEUED_BYTES = 1024 * 1024;

/** Provides the state and handlers for sending or receiving a file over WebRTC. */
export function useWebRTCFile({
  wsRef,
  setMessages,
  toast,
  iceServers,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0);
  const [transferState, setTransferState] = useState(null);
  const [transferFileName, setTransferFileName] = useState('');
  const [transferFileSize, setTransferFileSize] = useState(0);

  const filePcRef = useRef(null);
  const fileChannelRef = useRef(null);
  const fileWriterRef = useRef(null);
  const completedDownloadsRef = useRef([]);
  const chunkQueueRef = useRef(null);
  const fileSenderAckRef = useRef(null);
  const receivedBytesRef = useRef(0);
  const writtenBytesRef = useRef(0);
  const fileReaderRef = useRef(null);
  const fileTransferCancelledRef = useRef(false);
  const currentFileRef = useRef(null);
  const fileNoteRef = useRef('');
  const transferFileNameRef = useRef('');
  const transferFileSizeRef = useRef(0);
  const fileInviteIdRef = useRef(null);
  const receiverInviteIdRef = useRef(null);
  const filePendingCandidatesRef = useRef([]);

  useEffect(() => () => {
    for (const { writer, url } of completedDownloadsRef.current) {
      URL.revokeObjectURL(url);
      void writer.cleanup();
    }
    completedDownloadsRef.current = [];
  }, []);

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
    fileSenderAckRef.current = null;
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
    if (filePcRef.current) {
      filePcRef.current.close();
      filePcRef.current = null;
    }
    if (fileChannelRef.current) {
      fileChannelRef.current.close();
      fileChannelRef.current = null;
    }
    receivedBytesRef.current = 0;
    writtenBytesRef.current = 0;
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

  /** Cancels the active transfer, records failure, and releases its connection state. */
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

  /** Accepts a file invite, records its metadata, and starts the receiver connection. */
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

  /** Creates the peer connection and negotiates the file data channel. */
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
        setupSenderDataChannel(channel);

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

  const setupSenderDataChannel = (channel) => {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = 64 * 1024;
    let flowStarted = false;

    channel.onopen = () => setTransferState('connecting');

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
          return;
        }

        try {
          const message = JSON.parse(event.data);
          if (message.type === 'flow-ready' && !flowStarted &&
              Number.isSafeInteger(message.windowBytes) && message.windowBytes > 0) {
            flowStarted = true;
            setTransferState('sending');
            startSendingFileChunks(channel, Math.min(message.windowBytes, MAX_IN_FLIGHT_BYTES));
          } else if (message.type === 'flow-ack') {
            fileSenderAckRef.current?.(message.writtenBytes);
          }
        } catch (err) {
          console.warn('[WebRTC File] Ignoring invalid transfer control message:', err);
        }
      }
    };
  };

  /** Streams file slices through the data channel while updating progress and completion. */
  const startSendingFileChunks = async (channel, windowBytes) => {
    const file = currentFileRef.current;
    if (!file || !Number.isSafeInteger(windowBytes) || windowBytes <= 0) {
      setTransferState('failed');
      return;
    }

    const chunkSize = CHUNK_SIZE;
    const fileReader = new FileReader();
    fileReaderRef.current = fileReader;
    let offset = 0;
    let acknowledgedBytes = 0;
    let waitingForAck = false;
    let completed = false;
    let lastTime = Date.now();
    let bytesSentInInterval = 0;

    const readSlice = (o) => {
      if (fileTransferCancelledRef.current) return;
      if (o - acknowledgedBytes >= windowBytes) {
        waitingForAck = true;
        return;
      }
      const slice = file.slice(o, o + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };

    const finishSending = async () => {
      if (completed) return;
      completed = true;
      setTransferState('completed');
      const contentMsg = `Sent file: ${file.name} (${formatSize(file.size)})${fileNoteRef.current ? ` - "${fileNoteRef.current}"` : ''}`;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === fileInviteIdRef.current
            ? { ...m, type: 'file', metadata: { ...m.metadata, status: 'completed' } }
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
    };

    fileSenderAckRef.current = (writtenBytes) => {
      if (!Number.isSafeInteger(writtenBytes) || writtenBytes < acknowledgedBytes || writtenBytes > offset) return;
      acknowledgedBytes = writtenBytes;
      const now = Date.now();
      const elapsed = now - lastTime;
      if (elapsed >= 500 || acknowledgedBytes >= file.size) {
        setTransferProgress(Math.floor((acknowledgedBytes / Math.max(file.size, 1)) * 100));
        setTransferSpeed(Math.floor((bytesSentInInterval * 1000) / Math.max(elapsed, 1)));
        bytesSentInInterval = 0;
        lastTime = now;
      }

      if (waitingForAck && offset < file.size) {
        waitingForAck = false;
        readSlice(offset);
      } else if (offset >= file.size && acknowledgedBytes === file.size) {
        void finishSending();
      }
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
        void finishSending();
      }
    };

    readSlice(0);
  };

  /** Collects incoming chunks and publishes a downloadable file when complete. */
  const setupReceiverDataChannel = (channel) => {
    channel.binaryType = 'arraybuffer';
    receivedBytesRef.current = 0;
    writtenBytesRef.current = 0;
    let receiverFailed = false;
    let writerReady = false;
    let channelOpen = false;
    let readySent = false;
    let lastTime = Date.now();
    let bytesReceivedInInterval = 0;

    const failReceiver = async (error) => {
      if (receiverFailed) return;
      receiverFailed = true;
      console.error('[WebRTC File] Receiver write failed:', error);
      setTransferState('failed');
      toast.error('Could not save the received file. The transfer was stopped.');
      chunkQueueRef.current?.fail(error);
      if (channel.readyState === 'open') {
        try {
          channel.send('cancel');
        } catch (sendError) {
          console.warn('[WebRTC File] Failed to notify sender of write failure:', sendError);
        }
      }
      const writer = fileWriterRef.current;
      await chunkQueueRef.current?.whenIdle();
      await writer?.cleanup();
      fileWriterRef.current = null;
      chunkQueueRef.current = null;
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

    const initializeWriter = async () => {
      if (!Number.isSafeInteger(transferFileSizeRef.current) || transferFileSizeRef.current < 0) {
        await failReceiver(new Error('Invalid incoming file size'));
        return;
      }
      const writer = new FileWriter(
        receiverInviteIdRef.current || `incoming-${Date.now()}`,
        transferFileNameRef.current,
        transferFileSizeRef.current,
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
    };
    void initializeWriter();

    channel.onopen = () => {
      channelOpen = true;
      announceReady();
    };

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

      if (receiverFailed || !chunkQueueRef.current) return;
      const buffer = event.data;
      const totalSize = transferFileSizeRef.current;
      if (!(buffer instanceof ArrayBuffer) || receivedBytesRef.current + buffer.byteLength > totalSize) {
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

      const chunkEndOffset = offset + buffer.byteLength;
      writtenBytesRef.current = chunkEndOffset;
      bytesReceivedInInterval += buffer.byteLength;
      const now = Date.now();
      const elapsed = now - lastTime;
      if (elapsed >= 500 || writtenBytesRef.current === totalSize) {
        setTransferProgress(Math.floor((writtenBytesRef.current / Math.max(totalSize, 1)) * 100));
        setTransferSpeed(Math.floor((bytesReceivedInInterval * 1000) / Math.max(elapsed, 1)));
        bytesReceivedInInterval = 0;
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

      if (writtenBytesRef.current === totalSize) {
        try {
          await fileWriterRef.current.close();
          const blob = await fileWriterRef.current.getFileBlob();
          const downloadUrl = URL.createObjectURL(blob);
          const capturedFileName = transferFileNameRef.current;
          const capturedFileSize = transferFileSizeRef.current;
          setTransferState('completed');
          completedDownloadsRef.current.push({ writer: fileWriterRef.current, url: downloadUrl });
          fileWriterRef.current = null;
          chunkQueueRef.current = null;

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
        } catch (error) {
          await failReceiver(error);
        }
      }
    };

    channel.onclose = () => {
      console.log('[WebRTC File] Receiver data channel closed');
    };
  };

  /** Applies SDP and ICE signaling, queuing candidates until a remote description exists. */
  const handleFileSignaling = async (fromUserId, data) => {
    try {
      const pc = filePcRef.current;
      if (data.sdp) {
        if (data.sdp.type === 'offer') {
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            if (filePendingCandidatesRef.current && filePendingCandidatesRef.current.length > 0) {
              for (const cand of filePendingCandidatesRef.current) {
                try {
                  await pc.addIceCandidate(cand);
                } catch (error) {
                  console.error('[WebRTC File] Failed to apply queued ICE candidate:', error);
                }
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
              try {
                await pc.addIceCandidate(cand);
              } catch (error) {
                console.error('[WebRTC File] Failed to apply queued ICE candidate:', error);
              }
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
