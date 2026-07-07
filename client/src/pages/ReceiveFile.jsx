import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import ConnectionStatus from '../components/ConnectionStatus'
import ProgressBar from '../components/ProgressBar'
import ThroughputChart from '../components/ThroughputChart'
import { SocketService } from '../services/socketService'
import { WebRTCService } from '../services/webrtc'
import { FileWriter } from '../services/webrtc/fileWriter'
import { resumeStore } from '../services/webrtc/resumeStore'
import { Html5Qrcode } from 'html5-qrcode'

function inferDefaultSignalingUrl() {
  if (typeof window === 'undefined') {
    return 'wss://peershare-signalling.duckdns.org'
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const { hostname, port } = window.location

  // Prefer the local signalling server while developing on localhost.
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local')
  const isFrontendDevPort = port && port !== '3001' && (isLocalDev || port.startsWith('517') || port === '3000')

  if (isFrontendDevPort) {
    return `${wsProtocol}//${hostname}:3001`
  }

  return 'wss://peershare-signalling.duckdns.org'
}

const DEFAULT_SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || inferDefaultSignalingUrl()
const DEFAULT_STUN_URL = import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302'
const DEFAULT_TURN_URL = import.meta.env.VITE_TURN_URL || 'turn:16.176.103.2:3478?transport=udp,turn:16.176.103.2:3478?transport=tcp'
const DEFAULT_TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || 'test'
const DEFAULT_TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL || 'test123'

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

export default function ReceiveFile() {
  const query = useMemo(() => new URLSearchParams(window.location.search), [])
  const sessionFromQuery = query.get('session') || ''
  const tokenFromQuery = query.get('token') || ''

  const [signalingUrl, setSignalingUrl] = useState(DEFAULT_SIGNALING_URL)
  const [stunUrl, setStunUrl] = useState(DEFAULT_STUN_URL)
  const [turnUrl, setTurnUrl] = useState(DEFAULT_TURN_URL)
  const [turnUsername, setTurnUsername] = useState(DEFAULT_TURN_USERNAME)
  const [turnCredential, setTurnCredential] = useState(DEFAULT_TURN_CREDENTIAL)
  const [sessionId, setSessionId] = useState(sessionFromQuery)
  const [sessionToken, setSessionToken] = useState(tokenFromQuery)
  const [status, setStatus] = useState('Enter session credentials to join')
  const [connectionState, setConnectionState] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [speedHistory, setSpeedHistory] = useState([])
  const [routeType, setRouteType] = useState('unknown')
  const [joined, setJoined] = useState(false)
  const [downloadedFiles, setDownloadedFiles] = useState([])
  const [queue, setQueue] = useState([])
  
  // UI states
  const [showConfig, setShowConfig] = useState(false)
  const [directToDisk, setDirectToDisk] = useState(false)
  const [verifyIntegrity, setVerifyIntegrity] = useState(true)
  const [benchmark, setBenchmark] = useState(null)
  const [totalBytesState, setTotalBytesState] = useState(0)
  const [showScanner, setShowScanner] = useState(false)
  const scannerRef = useRef(null)

  const socketRef = useRef(null)
  const webrtcRef = useRef(null)
  const peerIdRef = useRef(crypto.randomUUID())
  const hashWorkerRef = useRef(null)
  const fsaDirectoryHandleRef = useRef(null)
  const transferRef = useRef({
    id: '',
    files: {},
    totalBytes: 0,
    receivedBytes: 0,
    currentFileId: '',
  })

  const cleanupCurrentTransfer = () => {
    const t = transferRef.current
    if (t.files) {
      for (const fId in t.files) {
        const fileEntry = t.files[fId]
        if (fileEntry.writer) {
          fileEntry.writer.cleanup().catch(() => {})
        }
      }
    }
    if (hashWorkerRef.current) {
      hashWorkerRef.current.terminate()
      hashWorkerRef.current = null
    }
    setTotalBytesState(0)
  }

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (webrtcRef.current) {
        const openPeers = webrtcRef.current.getOpenPeerIds()
        for (const peerId of openPeers) {
          try {
            webrtcRef.current.sendControl(peerId, { type: 'peer-exited' })
          } catch {
            // Ignore error if connection is already down
          }
        }
        webrtcRef.current.closeAll()
      }
      socketRef.current?.close()
      cleanupCurrentTransfer()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      socketRef.current?.close()
      webrtcRef.current?.closeAll()
      cleanupCurrentTransfer()
    }
  }, [])

  const iceServers = useMemo(() => {
    const servers = []

    if (stunUrl.trim()) {
      servers.push({ urls: stunUrl.trim() })
    }

    if (turnUrl.trim() && turnUsername.trim() && turnCredential.trim()) {
      servers.push({
        urls: turnUrl.trim(),
        username: turnUsername.trim(),
        credential: turnCredential.trim(),
      })
    }

    return servers.length ? servers : [{ urls: 'stun:stun.l.google.com:19302' }]
  }, [stunUrl, turnUrl, turnUsername, turnCredential])

  const connectToSession = (sid, token) => {
    if (!sid.trim()) {
      toast.error('Session ID is required')
      return
    }

    const cleanedSession = sid.trim()
    const cleanedToken = token.trim()

    setStatus('Connecting to signaling server...')
    setConnectionState('connecting')
    setDownloadedFiles([])
    setQueue([])
    setProgress(0)
    setSpeed(0)
    setSpeedHistory([])
    setRouteType('unknown')

    socketRef.current?.close()
    webrtcRef.current?.closeAll()

    const socket = new SocketService({ maxRetries: 4, retryDelayMs: 1200 })
    const webrtc = new WebRTCService(iceServers)

    webrtc.setHandlers({
      onSignal: (targetPeerId, data) => socket.sendSignal(targetPeerId, data),
      onChannelState: (_peerId, state) => {
        if (state === 'open') {
          setConnectionState('connected')
          setStatus('Connected to sender. Waiting for transmission...')
          toast.success('P2P connection established')
        }
        if (state === 'error') {
          setConnectionState('failed')
          setStatus('Data channel error')
        }
      },
      onConnectionState: (_peerId, state) => {
        if (state === 'failed') {
          setConnectionState('failed')
          setStatus('Peer connection failed')
          toast.error('Peer connection failed')
        }
      },
      onRouteType: (_peerId, nextRouteType) => {
        setRouteType(nextRouteType)
      },
      onData: async (peerId, data) => {
        if (typeof data === 'string') {
          try {
            const payload = JSON.parse(data)
            await handleControlMessage(webrtc, peerId, payload)
          } catch {
            // Ignore malformed control payloads
          }
        }
      },
      onBinaryFrame: async (peerId, frame) => {
        await handleBinaryChunkFrame(webrtc, peerId, frame)
      }
    })

    socket.connect({
      signalingUrl,
      roomId: cleanedSession,
      peerId: peerIdRef.current,
      role: 'receiver',
      token: cleanedToken,
      onOpen: () => {
        setJoined(true)
        setStatus('Joined signaling room. Waiting for sender...')
        toast.success('Joined session')
      },
      onMessage: async (message) => {
        if (message.type === 'peers') {
          for (const peer of message.peers) {
            const pid = typeof peer === 'string' ? peer : peer.peerId
            await webrtc.ensurePeerConnection(pid, false)
          }
        }

        if (message.type === 'peer-joined') {
          await webrtc.ensurePeerConnection(message.peerId, false)
        }

        if (message.type === 'peer-left') {
          setConnectionState('idle')
          setJoined(false)
          setStatus('Sender left the room. Connection closed.')
          toast.error('Sender left the room')
          webrtcRef.current?.closeAll()
          socketRef.current?.close()
        }

        if (message.type === 'signal') {
          await webrtc.handleSignal(message.fromPeerId, message.data)
        }
      },
      onClose: () => {
        if (connectionState !== 'connected') {
          setStatus('Signaling closed. Reconnecting...')
          setConnectionState('connecting')
        }
      },
      onRetry: ({ attempt, delay }) => {
        setStatus(`Signaling reconnect ${attempt}/4 in ${(delay / 1000).toFixed(1)}s...`)
      },
      onServerError: (message) => {
        setConnectionState('failed')
        setJoined(false)
        setStatus(message?.message || 'Server rejected credentials')
        toast.error(message?.message || 'Server rejected credentials')
      },
      onError: () => {
        setConnectionState('failed')
        setJoined(false)
        setStatus('Signaling server error')
      },
    })

    socketRef.current = socket
    webrtcRef.current = webrtc
  }

  const joinSession = () => {
    connectToSession(sessionId, sessionToken)
  }

  useEffect(() => {
    if (showScanner) {
      const timer = setTimeout(() => {
        const html5Qrcode = new Html5Qrcode('reader')
        scannerRef.current = html5Qrcode

        html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            try {
              const url = new URL(decodedText)
              const session = url.searchParams.get('session')
              const token = url.searchParams.get('token') || ''
              
              if (session) {
                setSessionId(session)
                setSessionToken(token)
                toast.success('Session details scanned successfully!')
                
                html5Qrcode.stop().then(() => {
                  setShowScanner(false)
                  connectToSession(session, token)
                }).catch(err => {
                  console.error('Failed to stop scanner:', err)
                  setShowScanner(false)
                  connectToSession(session, token)
                })
              } else {
                toast.error('Scanned QR code does not contain a session ID')
              }
            } catch {
              if (decodedText && decodedText.length > 3) {
                setSessionId(decodedText)
                toast.success('Session ID scanned successfully!')
                html5Qrcode.stop().then(() => {
                  setShowScanner(false)
                  connectToSession(decodedText, '')
                }).catch(() => {
                  setShowScanner(false)
                  connectToSession(decodedText, '')
                })
              } else {
                toast.error('Invalid QR code scanned')
              }
            }
          },
          () => {}
        ).catch(err => {
          console.error('Failed to start camera scanner:', err)
          toast.error('Failed to access camera. Please check permissions.')
          setShowScanner(false)
        })
      }, 300)

      return () => {
        clearTimeout(timer)
        if (scannerRef.current) {
          const currentScanner = scannerRef.current
          if (currentScanner.isScanning) {
            currentScanner.stop().catch(err => console.error('Cleanup stop failed:', err))
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScanner])

  async function handleControlMessage(webrtc, peerId, payload) {
    const t = transferRef.current

    if (payload.type === 'transfer-start') {
      cleanupCurrentTransfer()
      t.id = payload.transferId
      t.totalBytes = payload.totalBytes || 0
      setTotalBytesState(payload.totalBytes || 0)
      t.receivedBytes = 0
      t.files = {}
      t.currentFileId = ''
      t.lastProgressUpdate = 0
      t.lastSpeedCalc = 0
      setProgress(0)
      setSpeed(0)
      setSpeedHistory([])
      setQueue([])
      setBenchmark(null)
      setStatus('Transfer starting...')

      // Initialize hash verifier background Web Worker
      hashWorkerRef.current = new Worker(new URL('../services/webrtc/hashWorker.js', import.meta.url), { type: 'module' })
      hashWorkerRef.current.onmessage = async (e) => {
        const { type, fileId, blockIndex, isValid } = e.data
        if (type === 'verify-result') {
          const fileEntry = t.files[fileId]
          if (!fileEntry) return

          if (fileEntry.blockCache) {
            delete fileEntry.blockCache[blockIndex]
          }

          if (isValid) {
            // Mark block as verified
            fileEntry.verifiedBlocks[blockIndex] = true
            
            // Save verified bitmap to resume DB
            await resumeStore.saveTransfer(t.id, {
              totalBytes: t.totalBytes,
              files: Object.keys(t.files).map(id => ({
                id,
                name: t.files[id].meta.name,
                size: t.files[id].meta.size
              }))
            }, Object.keys(t.files).reduce((acc, id) => {
              acc[id] = Array.from(t.files[id].verifiedBlocks)
              return acc
            }, {}))

            // Check if file is completely received and verified
            const allVerified = fileEntry.verifiedBlocks.every(v => v === true)
            if (allVerified) {
              await finalizeFile(fileEntry)
            }
          } else {
            console.warn(`[Integrity] Hash mismatch detected on block ${blockIndex} for ${fileEntry.meta.name}. Requesting NACK retransmit.`)
            toast.error(`Integrity check failed for block ${blockIndex + 1} of ${fileEntry.meta.name}. Retransmitting...`)
            
            // Send NACK message back to sender to retransmit the block
            webrtc.sendControl(peerId, {
              type: 'nack-block',
              fileIndex: Object.keys(t.files).indexOf(fileId),
              blockIndex
            })

            // Deduct the failed block's bytes from the progress counters and reset it
            const oldBlockBytes = fileEntry.blockBytes[blockIndex] || 0
            fileEntry.blockBytes[blockIndex] = 0
            fileEntry.received -= oldBlockBytes
            t.receivedBytes -= oldBlockBytes

            // Trigger progress state refresh immediately
            const percent = t.totalBytes > 0 ? Math.min(100, Math.round((t.receivedBytes / t.totalBytes) * 100)) : 0
            setProgress(percent)
          }
        }
      }
    }

    if (payload.type === 'file-block-hashes') {
      const fileEntry = Object.values(t.files)[payload.fileIndex]
      if (fileEntry) {
        fileEntry.blockHashes = payload.hashes
      }
    }

    if (payload.type === 'file-meta') {
      t.currentFileId = payload.id
      
      const BLOCK_SIZE = 4 * 1024 * 1024
      const totalBlocks = Math.ceil(payload.size / BLOCK_SIZE)
      const verifiedBlocks = Array(totalBlocks).fill(false)

      const fileEntry = {
        meta: payload,
        writer: null,
        received: 0,
        blockHashes: [],
        verifiedBlocks,
        blockBytes: {},
        blockCache: {},
        isEndReceived: false,
        isFinalized: false
      }

      t.files[payload.id] = fileEntry

      setQueue((curr) => [
        ...curr,
        { id: payload.id, name: payload.name, size: payload.size, status: 'receiving' },
      ])

      setStatus(`Receiving ${payload.name}...`)

      // Try setting up FileWriter
      let fileHandle = null
      if (directToDisk && fsaDirectoryHandleRef.current) {
        try {
          fileHandle = await fsaDirectoryHandleRef.current.getFileHandle(payload.name, { create: true })
        } catch (err) {
          console.warn('[FSA] Directory file handle creation failed, falling back:', err)
        }
      }

      const writer = new FileWriter(payload.id, payload.name, payload.size, payload.mime)
      await writer.init(fileHandle)
      fileEntry.writer = writer

      // Check if we can resume this transfer from IndexedDB
      let resumeOffset = 0
      try {
        const record = await resumeStore.getTransfer(t.id)
        if (record && record.bitmaps && record.bitmaps[payload.id]) {
          const savedBitmap = record.bitmaps[payload.id]
          // Restore verified blocks
          for (let i = 0; i < savedBitmap.length; i++) {
            if (savedBitmap[i]) {
              fileEntry.verifiedBlocks[i] = true
              fileEntry.blockBytes[i] = Math.min(BLOCK_SIZE, payload.size - i * BLOCK_SIZE)
              resumeOffset += fileEntry.blockBytes[i]
            }
          }
        }
      } catch (err) {
        console.warn('[ResumeStore] Failed to restore progress:', err)
      }

      if (resumeOffset > 0) {
        fileEntry.received = resumeOffset
        t.receivedBytes += resumeOffset
        setStatus(`Resuming ${payload.name} from ${(resumeOffset / 1024 / 1024).toFixed(2)} MB...`)
      }

      // Acknowledge file metadata reception and request starting offset
      webrtc.sendControl(peerId, {
        type: 'file-ack',
        id: payload.id,
        receivedBytes: resumeOffset,
      })
    }

    if (payload.type === 'file-end') {
      const fileEntry = t.files[payload.id]
      if (fileEntry) {
        fileEntry.isEndReceived = true
        // If all blocks are already verified, finalize file now
        const allVerified = fileEntry.verifiedBlocks.every(v => v === true)
        if (allVerified) {
          await finalizeFile(fileEntry)
        }
      }
      t.currentFileId = ''
    }

    if (payload.type === 'transfer-complete') {
      setProgress(100)
      setSpeed(0)
      setSpeedHistory([])
      setStatus('Transfer complete')
      toast.success('All files downloaded')
      setBenchmark(payload.benchmark)
      
      // Clean up resume database
      try {
        await resumeStore.deleteTransfer(t.id)
      } catch (err) {
        console.warn('[ResumeStore] Cleanup failed:', err)
      }
    }

    if (payload.type === 'transfer-cancelled') {
      setStatus('Sender cancelled transfer')
      setQueue((curr) =>
        curr.map((item) => (item.status === 'receiving' ? { ...item, status: 'failed' } : item)),
      )
      cleanupCurrentTransfer()
      toast('Transfer cancelled by sender')
    }

    if (payload.type === 'peer-exited') {
      setStatus('Sender exited. Connection closed.')
      setConnectionState('idle')
      setJoined(false)
      toast.error('Sender exited the session')
      webrtcRef.current?.closeAll()
      socketRef.current?.close()
    }
  }

  const finalizeFile = async (fileEntry) => {
    if (fileEntry.isFinalized) return
    fileEntry.isFinalized = true

    try {
      await fileEntry.writer.close()

      setDownloadedFiles((curr) => [
        ...curr,
        {
          id: fileEntry.meta.id,
          name: fileEntry.meta.name,
          size: fileEntry.meta.size,
        },
      ])

      setQueue((curr) =>
        curr.map((item) => (item.id === fileEntry.meta.id ? { ...item, status: 'downloaded' } : item)),
      )
    } catch (err) {
      console.error('[Receive] File finalization failed:', err)
      toast.error(`Failed to save ${fileEntry.meta.name}`)
    }
  }

  async function handleBinaryChunkFrame(webrtc, peerId, frame) {
    const t = transferRef.current
    const filesList = Object.values(t.files)
    const fileEntry = filesList[frame.fileIdIndex]
    if (!fileEntry) return

    const { offset, payload } = frame
    const length = payload.byteLength

    // Write chunk using tiered storage writer
    await fileEntry.writer.write(offset, payload)

    const BLOCK_SIZE = 4 * 1024 * 1024
    const blockIndex = Math.floor(offset / BLOCK_SIZE)
    const currentBlockBytes = fileEntry.blockBytes[blockIndex] || 0

    // Only count up to block boundary (or file end)
    const blockStartOffset = blockIndex * BLOCK_SIZE
    const blockEndOffset = Math.min(fileEntry.meta.size, (blockIndex + 1) * BLOCK_SIZE)
    const maxBlockSize = blockEndOffset - blockStartOffset

    const newBlockBytes = Math.min(maxBlockSize, currentBlockBytes + length)
    const addedBytes = newBlockBytes - currentBlockBytes
    fileEntry.blockBytes[blockIndex] = newBlockBytes

    fileEntry.received += addedBytes
    t.receivedBytes += addedBytes

    // Cache the block data in memory for verification
    if (!fileEntry.blockCache) {
      fileEntry.blockCache = {}
    }
    if (!fileEntry.blockCache[blockIndex]) {
      fileEntry.blockCache[blockIndex] = new Uint8Array(maxBlockSize)
    }
    const blockOffset = offset % BLOCK_SIZE
    fileEntry.blockCache[blockIndex].set(new Uint8Array(payload), blockOffset)

    // Update speeds & progress
    const percent = t.totalBytes > 0 ? Math.min(100, Math.round((t.receivedBytes / t.totalBytes) * 100)) : 0
    const now = performance.now()
    if (!t.lastProgressUpdate || now - t.lastProgressUpdate >= 150 || percent === 100) {
      setProgress(percent)
      t.lastProgressUpdate = now
    }

    if (!t.lastSpeedCalc) {
      t.lastSpeedCalc = now
      t.bytesThisCalc = 0
    }
    t.bytesThisCalc += length
    const diff = (now - t.lastSpeedCalc) / 1000
    if (diff >= 0.6) {
      const currentSpeed = t.bytesThisCalc / diff
      setSpeed(currentSpeed)
      setSpeedHistory((prev) => [...prev.slice(-19), currentSpeed])
      t.bytesThisCalc = 0
      t.lastSpeedCalc = now
    }

    // Verify block hash if a 4 MB block is fully received
    const expectedBlockSize = Math.min(BLOCK_SIZE, fileEntry.meta.size - blockIndex * BLOCK_SIZE)

    if (fileEntry.blockBytes[blockIndex] === expectedBlockSize) {
      if (verifyIntegrity && fileEntry.blockHashes && fileEntry.blockHashes[blockIndex] && hashWorkerRef.current) {
        try {
          const cachedData = fileEntry.blockCache[blockIndex]
          if (cachedData) {
            // Slice the buffer to get a clean copy for the background worker
            const blockBuffer = cachedData.buffer.slice(0)

            hashWorkerRef.current.postMessage({
              type: 'verify-block',
              fileId: fileEntry.meta.id,
              blockIndex,
              data: blockBuffer,
              expectedHash: fileEntry.blockHashes[blockIndex]
            }, [blockBuffer])
          } else {
            fileEntry.verifiedBlocks[blockIndex] = true
            const allVerified = fileEntry.verifiedBlocks.every(v => v === true)
            if (allVerified) {
              await finalizeFile(fileEntry)
            }
          }
        } catch {
          fileEntry.verifiedBlocks[blockIndex] = true
          const allVerified = fileEntry.verifiedBlocks.every(v => v === true)
          if (allVerified) {
            await finalizeFile(fileEntry)
          }
        }
      } else {
        fileEntry.verifiedBlocks[blockIndex] = true
        const allVerified = fileEntry.verifiedBlocks.every(v => v === true)
        if (allVerified) {
          await finalizeFile(fileEntry)
        }
      }
    }
  }

  const handleDownload = async (file) => {
    try {
      const fileEntry = transferRef.current.files[file.id]
      if (!fileEntry) {
        toast.error('File data not found')
        return
      }

      // If user used direct-to-disk (FSA), the file is already saved to their local folder!
      if (directToDisk && fsaDirectoryHandleRef.current) {
        toast.success(`File is already saved in your selected folder: ${file.name}`)
        return
      }

      toast('Preparing download...')
      const fileBlob = await fileEntry.writer.getFileBlob()
      const tempUrl = URL.createObjectURL(fileBlob)
      
      const a = document.createElement('a')
      a.href = tempUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Revoke after a delay to ensure the browser has started the download stream
      setTimeout(() => {
        URL.revokeObjectURL(tempUrl)
      }, 20000)
    } catch (err) {
      console.error('[Download] Failed to download file:', err)
      toast.error(`Failed to download ${file.name}`)
    }
  }

  const cancelTransfer = () => {
    if (!webrtcRef.current) return
    const peerId = webrtcRef.current.getOpenPeerIds()[0]
    if (peerId) {
      webrtcRef.current.sendControl(peerId, { type: 'transfer-cancelled' })
    }
    cleanupCurrentTransfer()
    setQueue((curr) =>
      curr.map((item) => (item.status === 'receiving' ? { ...item, status: 'failed' } : item)),
    )
    setStatus('Transfer cancelled')
    toast('Transfer cancelled')
  }

  const handleDirectToDiskChange = async (e) => {
    const checked = e.target.checked
    if (checked) {
      if (!window.showDirectoryPicker) {
        toast.error('Direct-to-Disk (FSA API) is not supported by this browser. Defaulting to OPFS/IndexedDB.')
        setDirectToDisk(false)
        return
      }
      try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
        fsaDirectoryHandleRef.current = handle
        setDirectToDisk(true)
        toast.success('Download folder selected successfully!')
      } catch (err) {
        console.warn('[FSA] Directory picker closed/failed:', err)
        fsaDirectoryHandleRef.current = null
        setDirectToDisk(false)
      }
    } else {
      fsaDirectoryHandleRef.current = null
      setDirectToDisk(false)
    }
  }

  const totalSize = totalBytesState

  const statusTone = connectionState === 'connected'
    ? 'connected'
    : connectionState === 'failed'
      ? 'failed'
      : connectionState === 'connecting'
        ? 'connecting'
        : 'idle'

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 animate-fadeIn relative">
      {/* Decorative backdrop glows */}
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-72 h-72 rounded-full bg-pink-500/5 blur-3xl pointer-events-none" />

      <div className="border-b border-slate-250/30 dark:border-slate-800/30 pb-6 relative z-10">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Receive Files</h1>
            <ConnectionStatus state={statusTone} message={status} />
            {routeType !== 'unknown' && (
              <span className={`rounded-2xl border px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-300 ${
                routeType === 'relay'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}>
                Route: {routeType === 'relay' ? 'TURN' : 'P2P'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Join a secure sharing tunnel to download files directly.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] relative z-10">
        
        {/* Pairing Portal & Connection Config */}
        <div className="space-y-6">
          <div className="glass-panel rounded-[32px] p-6 shadow-xl border border-white/20 dark:border-slate-800/30 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Pairing Details</h2>

            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Session Room ID</span>
                <input
                  placeholder="Enter 4-digit code or UUID"
                  value={sessionId}
                  onChange={(event) => setSessionId(event.target.value)}
                  disabled={joined && connectionState === 'connected'}
                  className="w-full rounded-2xl border border-slate-205 bg-white/50 px-4 py-3 font-semibold text-slate-850 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:border-indigo-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Security Token (Optional)</span>
                <input
                  placeholder="Enter session token (if required)"
                  type="password"
                  value={sessionToken}
                  onChange={(event) => setSessionToken(event.target.value)}
                  disabled={joined && connectionState === 'connected'}
                  className="w-full rounded-2xl border border-slate-205 bg-white/50 px-4 py-3 font-semibold text-slate-855 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:border-indigo-500"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={joinSession}
                  disabled={joined && connectionState === 'connected'}
                  className="hover-lift flex-grow flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md shadow-indigo-600/10 hover:shadow-indigo-550/30 disabled:opacity-50 transition duration-300"
                >
                  <span>Connect Session</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  disabled={joined && connectionState === 'connected'}
                  className="hover-lift flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3.5 text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:border-indigo-800/30 dark:bg-indigo-950/20 dark:text-indigo-400 disabled:opacity-50 transition duration-300"
                  title="Scan QR Code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </button>

                {joined && (
                  <button
                    type="button"
                    onClick={cancelTransfer}
                    className="rounded-xl border border-rose-250 bg-rose-500/5 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-rose-600 hover:bg-rose-500/10 dark:border-rose-900/20 dark:text-rose-450 transition duration-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Config accordion */}
          <div className="glass-panel rounded-[28px] overflow-hidden shadow-sm transition-all duration-300 border border-white/20 dark:border-slate-800/30">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between px-6 py-4 font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-455 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition"
            >
              <div className="flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Advanced Connection Config</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition duration-300 ${showConfig ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showConfig && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-200/50 dark:border-slate-800/20 grid gap-4 md:grid-cols-2 text-xs">
                <label className="space-y-1">
                  <span className="font-bold text-slate-505">Signaling WS Endpoint</span>
                  <input
                    value={signalingUrl}
                    onChange={(event) => setSignalingUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-bold text-slate-505">STUN Server URL</span>
                  <input
                    value={stunUrl}
                    onChange={(event) => setStunUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-bold text-slate-505">TURN Relay Server URL</span>
                  <input
                    value={turnUrl}
                    onChange={(event) => setTurnUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-bold text-slate-550 font-semibold">TURN Auth Username</span>
                  <input
                    value={turnUsername}
                    onChange={(event) => setTurnUsername(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="font-bold text-slate-550 font-semibold">TURN Auth Password / Credential</span>
                  <input
                    type="password"
                    value={turnCredential}
                    onChange={(event) => setTurnCredential(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <div className="flex flex-col gap-3 md:col-span-2 mt-2 border-t border-slate-200/50 dark:border-slate-800/20 pt-4">
                  <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Storage & Verification Options</span>
                  <label className="flex items-start gap-3 cursor-pointer text-slate-700 dark:text-slate-350">
                    <input
                      type="checkbox"
                      checked={directToDisk}
                      onChange={handleDirectToDiskChange}
                      className="mt-1 rounded border-slate-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold block text-xs">Direct-to-Disk Download (FSA API)</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-relaxed">Stream files directly to a selected system folder. Prevents browser crash limits on multi-gigabyte transfers.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer text-slate-700 dark:text-slate-350">
                    <input
                      type="checkbox"
                      checked={verifyIntegrity}
                      onChange={(e) => setVerifyIntegrity(e.target.checked)}
                      className="mt-1 rounded border-slate-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold block text-xs">Enable Background Integrity Verification</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-relaxed">Verify block hashes on-the-fly using secondary background threads and automatically retransmit corrupted chunks via NACKs.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Download lists, route tracking, queues */}
        <div className="space-y-6">
          {joined && (
            <div className="glass-panel rounded-[32px] p-6 shadow-xl space-y-6 border border-white/20 dark:border-slate-800/30">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Active Transmission</h2>
              
              <ProgressBar 
                label="Overall Progress" 
                progress={progress} 
                speed={speed} 
                totalBytes={totalSize}
              />

              <ThroughputChart data={speedHistory} />

              <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-800/20 pt-4">
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">Route Type</p>
                  <p className="text-sm font-extrabold text-slate-850 dark:text-slate-250 mt-1 font-sans">
                    {routeType === 'relay' ? (
                      <span className="text-amber-500">Relayed (TURN)</span>
                    ) : routeType === 'direct' ? (
                      <span className="text-emerald-500">Direct (P2P)</span>
                    ) : (
                      <span>Pending...</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">Total Size</p>
                  <p className="text-sm font-extrabold text-slate-850 dark:text-slate-250 mt-1 font-mono">
                    {totalSize > 0 ? formatSize(totalSize) : '-'}
                  </p>
                </div>
              </div>

              {/* Active Queue status */}
              {queue.length > 0 && (
                <div className="space-y-2 border-t border-slate-200/50 dark:border-slate-800/20 pt-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">Files Queue</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl bg-slate-100/30 p-3 text-xs dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/10 min-w-0"
                      >
                        <span className="max-w-[65%] truncate font-bold text-slate-700 dark:text-slate-350">{item.name}</span>
                        <span className={`flex-shrink-0 rounded-xl px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider ${
                          item.status === 'downloaded'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : item.status === 'receiving'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : item.status === 'failed'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20'
                                : 'bg-slate-250/50 text-slate-500 dark:bg-slate-800 dark:text-slate-405'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Benchmark Report Card */}
          {benchmark && (
            <div className="glass-panel rounded-[32px] p-6 shadow-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/10 space-y-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Transfer Benchmark Report
              </h2>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650 dark:text-slate-400">
                <div className="bg-slate-100/30 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/20">
                  <p className="text-slate-400 dark:text-slate-505 text-[9px] uppercase tracking-wider font-extrabold">Average Throughput</p>
                  <p className="text-sm font-extrabold text-slate-850 dark:text-slate-200 mt-0.5">
                    {formatSize(benchmark.averageSpeed)}/s
                  </p>
                </div>
                <div className="bg-slate-100/30 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/20">
                  <p className="text-slate-400 dark:text-slate-505 text-[9px] uppercase tracking-wider font-extrabold">Peak Speed</p>
                  <p className="text-sm font-extrabold text-slate-850 dark:text-slate-200 mt-0.5">
                    {formatSize(benchmark.peakSpeed)}/s
                  </p>
                </div>
                <div className="bg-slate-100/30 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/45 dark:border-slate-800/20">
                  <p className="text-slate-400 dark:text-slate-505 text-[9px] uppercase tracking-wider font-extrabold">Smoothed Latency (RTT)</p>
                  <p className="text-sm font-extrabold text-slate-850 dark:text-slate-200 mt-0.5">
                    {benchmark.rttMs} ms
                  </p>
                </div>
                <div className="bg-slate-100/30 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/45 dark:border-slate-800/20">
                  <p className="text-slate-400 dark:text-slate-550 text-[9px] uppercase tracking-wider font-extrabold">Data Channels Used</p>
                  <p className="text-sm font-extrabold text-slate-855 dark:text-slate-200 mt-0.5">
                    {benchmark.activeChannels} / 4 parallel
                  </p>
                </div>
                <div className="bg-slate-100/30 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/45 dark:border-slate-800/20 col-span-2">
                  <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider font-extrabold">Packet Retransmissions (NACKs)</p>
                  <p className="text-sm font-extrabold text-rose-500 mt-0.5 font-mono">
                    {benchmark.retransmissions} chunks retransmitted
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Downloaded Files Panel */}
          <div className="glass-panel rounded-[32px] p-6 shadow-xl space-y-4 border border-white/20 dark:border-slate-800/30">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Downloaded Files ({downloadedFiles.length})</h2>
            
            {downloadedFiles.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-6 text-center text-sm text-slate-400 dark:border-slate-900 dark:bg-slate-950/20 dark:text-slate-500">
                Files ready for download will appear here.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {downloadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 hover:border-indigo-500/20 dark:hover:border-indigo-400/20 transition-all duration-200 min-w-0"
                  >
                    <div className="max-w-[70%] min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-sm">{file.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-555 font-bold">{formatSize(file.size)}</p>
                    </div>
                    
                    <button
                      onClick={() => handleDownload(file)}
                      className="hover-lift flex-shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-650 to-indigo-500 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm hover:shadow-indigo-500/30 transition duration-300"
                    >
                      <span>Download</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-md rounded-[32px] p-6 border border-white/20 dark:border-slate-800/30 space-y-4 shadow-2xl bg-white/10 dark:bg-slate-950/40">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-850 dark:text-white">Scan Session QR Code</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div id="reader" className="overflow-hidden rounded-2xl bg-black/40 border border-slate-250/20 dark:border-slate-800/20" style={{ minHeight: '300px' }}></div>
            
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 font-semibold">
              Position the QR code inside the camera viewfinder to connect.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
