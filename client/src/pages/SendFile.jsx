import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import ConnectionStatus from '../components/ConnectionStatus'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import ThroughputChart from '../components/ThroughputChart'
import QRCodeGenerator from '../components/QRCodeGenerator'
import { SocketService } from '../services/socketService'
import { WebRTCService } from '../services/webrtc'

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
const CHUNK_SIZE_PRESETS_KB = [32, 64, 128, 256, 512]
const INITIAL_SHARE_MODE =
  new URLSearchParams(window.location.search).get('mode') === 'nearby' ? 'nearby' : 'link'

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function toHttpUrl(signalingUrl) {
  return signalingUrl.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:')
}

export default function SendFile() {
  const [signalingUrl, setSignalingUrl] = useState(DEFAULT_SIGNALING_URL)
  const [stunUrl, setStunUrl] = useState(DEFAULT_STUN_URL)
  const [turnUrl, setTurnUrl] = useState(DEFAULT_TURN_URL)
  const [turnUsername, setTurnUsername] = useState(DEFAULT_TURN_USERNAME)
  const [turnCredential, setTurnCredential] = useState(DEFAULT_TURN_CREDENTIAL)
  const [files, setFiles] = useState([])
  const [shareMode, setShareMode] = useState(INITIAL_SHARE_MODE)
  const [sessionId, setSessionId] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [status, setStatus] = useState('Ready to create a sharing session')
  const [connectionState, setConnectionState] = useState('idle')
  const [receiverConnected, setReceiverConnected] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [speedHistory, setSpeedHistory] = useState([])
  const [chunkSizeKB, setChunkSizeKB] = useState(64)
  const [sending, setSending] = useState(false)
  const [receiverToken, setReceiverToken] = useState('')
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null)
  const [expiresInLabel, setExpiresInLabel] = useState('-')
  const [routeType, setRouteType] = useState('unknown')
  const [queue, setQueue] = useState([])
  const [attempt, setAttempt] = useState(0)
  const [activeTransferSize, setActiveTransferSize] = useState(0)
  
  // UI States
  const [showConfig, setShowConfig] = useState(false)
  const [benchmark, setBenchmark] = useState(null)

  const socketRef = useRef(null)
  const webrtcRef = useRef(null)
  const cancelRef = useRef(false)
  const peerIdRef = useRef(crypto.randomUUID())

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
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      socketRef.current?.close()
      webrtcRef.current?.closeAll()
    }
  }, [])

  useEffect(() => {
    if (!sessionExpiresAt) {
      return
    }

    const updateCountdown = () => {
      const remainingMs = sessionExpiresAt - Date.now()
      if (remainingMs <= 0) {
        setExpiresInLabel('Expired')
        return
      }

      const totalSeconds = Math.floor(remainingMs / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      setExpiresInLabel(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }

    const timerId = setInterval(updateCountdown, 1000)
    setTimeout(updateCountdown, 0)
    
    return () => {
      clearInterval(timerId)
      setExpiresInLabel('-')
    }
  }, [sessionExpiresAt])

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])

  const normalizeTurnUrls = (value) => value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  const iceServers = useMemo(() => {
    const servers = []

    if (stunUrl.trim()) {
      servers.push({ urls: stunUrl.trim() })
    }

    const turnUrls = normalizeTurnUrls(turnUrl)
    if (turnUrls.length && turnUsername.trim() && turnCredential.trim()) {
      servers.push({
        urls: turnUrls.length > 1 ? turnUrls : turnUrls[0],
        username: turnUsername.trim(),
        credential: turnCredential.trim(),
      })
    }

    return servers.length ? servers : [{ urls: 'stun:stun.l.google.com:19302' }]
  }, [stunUrl, turnUrl, turnUsername, turnCredential])

  const createSessionId = () => {
    if (shareMode === 'nearby') {
      return String(Math.floor(1000 + Math.random() * 9000))
    }
    return crypto.randomUUID().replaceAll('-', '').slice(0, 12)
  }

  const createSessionOnServer = async () => {
    const roomId = createSessionId()
    const response = await fetch(`${toHttpUrl(signalingUrl)}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({  roomId}),
    })

    if (!response.ok) {
      throw new Error('Failed to create session on signaling server')
    }

    const payload = await response.json()
    if (!payload?.ok || !payload?.roomId || !payload?.receiverToken || !payload?.senderToken) {
      throw new Error('Invalid session response from signaling server')
    }

    return payload
  }

  const startSession = async () => {
    if (files.length === 0) {
      toast.error('Select at least one file first')
      return
    }

    let id = ''
    let senderToken = ''
    let receiverToken = ''

    try {
      const created = await createSessionOnServer()
      id = created.roomId
      senderToken = created.senderToken
      receiverToken = created.receiverToken
      setReceiverToken(receiverToken)
      setSessionExpiresAt(created.expiresAt || null)
    } 
    catch (error) {
      setConnectionState('failed')
      setStatus('Failed to create session')
      toast.error(error?.message || 'Failed to create session')
      return
    }

    const link =
      shareMode === 'nearby'
        ? `${window.location.origin}/receive?mode=nearby&session=${id}&token=${encodeURIComponent(receiverToken)}`
        : `${window.location.origin}/receive?session=${id}&token=${encodeURIComponent(receiverToken)}`

    setSessionId(id)
    setShareLink(link)
    setStatus(
      shareMode === 'nearby'
        ? 'Creating nearby sharing session...'
        : 'Creating signaling session...',
    )
    setConnectionState('connecting')
    setReceiverConnected(false)
    setProgress(0)
    setSpeed(0)
    setSpeedHistory([])
    setRouteType('unknown')
    setBenchmark(null)
    setAttempt(0)
    setQueue(
      files.map((file, index) => ({
        id: `${index}:${file.name}:${file.size}:${file.lastModified}`,
        name: file.name,
        status: 'pending',
      })),
    )

    socketRef.current?.close()
    webrtcRef.current?.closeAll()

    const socket = new SocketService({ maxRetries: 4, retryDelayMs: 1200 })
    const webrtc = new WebRTCService(iceServers)

    webrtc.setHandlers({
      onSignal: (targetPeerId, data) => socket.sendSignal(targetPeerId, data),
      onChannelState: (_peerId, state) => {
        if (state === 'open') {
          setReceiverConnected(true)
          setConnectionState('connected')
          setStatus('Receiver connected. Ready to transfer.')
          toast.success('Receiver connected')
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
      onData: (_peerId, data) => {
        if (typeof data !== 'string') return
        try {
          const payload = JSON.parse(data)
          if (payload.type === 'transfer-cancelled') {
            setSending(false)
            setStatus('Receiver cancelled transfer')
            toast('Receiver cancelled transfer')
          }
          if (payload.type === 'peer-exited') {
            toast.error('Receiver exited the session')
            setStatus('Receiver exited. Connection closed.')
            setConnectionState('idle')
            setReceiverConnected(false)
            webrtcRef.current?.closeAll()
            socketRef.current?.close()
          }
        } catch {
          // Ignore malformed control messages.
        }
      },
    })

    socket.connect({
      signalingUrl,
      roomId: id,
      peerId: peerIdRef.current,
      role: 'sender',
      token: senderToken,
      onOpen: () => {
        setStatus(
          shareMode === 'nearby'
            ? `Nearby session ready. Share QR or local code ${id}...`
            : 'Session ready. Share link or QR and wait for receiver...',
        )
        toast.success('Session created')
      },
      onMessage: async (message) => {
        if (message.type === 'peers') {
          for (const peer of message.peers) {
            const peerId = typeof peer === 'string' ? peer : peer.peerId
            await webrtc.ensurePeerConnection(peerId, true)
          }
        }

        if (message.type === 'peer-joined') {
          await webrtc.ensurePeerConnection(message.peerId, true)
        }

        if (message.type === 'peer-left') {
          setReceiverConnected(false)
          setStatus('Receiver disconnected. Connection closed.')
          setConnectionState('idle')
          toast.error('Receiver disconnected')
          webrtcRef.current?.closeAll()
          socketRef.current?.close()
        }

        if (message.type === 'signal') {
          await webrtc.handleSignal(message.fromPeerId, message.data)
        }
      },
      onClose: () => {
        if (!sending) {
          setStatus('Signaling connection closed. Retrying...')
          setConnectionState('connecting')
        }
      },
      onRetry: ({ attempt: retryAttempt, delay }) => {
        setStatus(`Signaling reconnect ${retryAttempt}/4 in ${(delay / 1000).toFixed(1)}s...`)
      },
      onServerError: (message) => {
        setConnectionState('failed')
        setStatus(message?.message || 'Server rejected session')
        toast.error(message?.message || 'Server rejected session')
      },
      onError: () => {
        setConnectionState('failed')
        setStatus('Signaling server error')
      },
    })

    socketRef.current = socket
    webrtcRef.current = webrtc
  }

  const performTransfer = async (filesToTransfer) => {
    if (!webrtcRef.current) {
      toast.error('Start a session first')
      return
    }

    const peerId =
      webrtcRef.current.getOpenPeerIds()[0] ||
      webrtcRef.current.getKnownPeerIds?.()[0]
    if (!peerId) {
      toast.error('No receiver connected yet')
      return
    }

    const parsedChunkSizeKB = Number(chunkSizeKB)
    const chunkSizeBytes = Number.isFinite(parsedChunkSizeKB) && parsedChunkSizeKB > 0
      ? Math.floor(parsedChunkSizeKB * 1024)
      : 64 * 1024

    cancelRef.current = false
    setSending(true)
    setBenchmark(null)

    const transferSize = filesToTransfer.reduce((sum, file) => sum + file.size, 0)
    setActiveTransferSize(transferSize)

    setStatus(`Starting transfer with ${Math.floor(chunkSizeBytes / 1024)} KB chunks...`)

    const maxAttempts = 2
    for (let currentAttempt = 1; currentAttempt <= maxAttempts; currentAttempt += 1) {
      setAttempt(currentAttempt)

      try {
        await webrtcRef.current.sendFiles(
          peerId,
          filesToTransfer,
          (value) => setProgress(value),
          (bytesPerSec) => {
            setSpeed(bytesPerSec)
            setSpeedHistory((prev) => [...prev.slice(-19), bytesPerSec])
          },
          (message) => setStatus(message),
          () => cancelRef.current,
          chunkSizeBytes,
          (fileId, fileStatus, fileMeta) => {
            const fileIdSuffix = fileId.substring(fileId.indexOf(':') + 1)
            setQueue((current) =>
              current.map((item) => {
                const itemSuffix = item.id.substring(item.id.indexOf(':') + 1)
                return itemSuffix === fileIdSuffix
                  ? { ...item, status: fileStatus, name: fileMeta?.name || item.name }
                  : item
              }),
            )
          },
          (report) => setBenchmark(report)
        )
        setSending(false)
        if (!cancelRef.current) {
          toast.success('Files transferred successfully')

          setQueue((current) => {
            const fileIdSuffixes = filesToTransfer.map(f => `${f.name}:${f.size}:${f.lastModified}`)
            const nextQueue = current.map((item) => {
              const itemSuffix = item.id.substring(item.id.indexOf(':') + 1)
              return fileIdSuffixes.includes(itemSuffix)
                ? { ...item, status: 'sent' }
                : item
            })

            const hasRemaining = nextQueue.some(item => item.status !== 'sent')
            if (!hasRemaining) {
              setFiles([])
              return []
            }
            return nextQueue
          })
        }
        return
      } catch (error) {
        if (currentAttempt >= maxAttempts || cancelRef.current) {
          const fileIdSuffixes = filesToTransfer.map(f => `${f.name}:${f.size}:${f.lastModified}`)
          setQueue((current) =>
            current.map((item) => {
              const itemSuffix = item.id.substring(item.id.indexOf(':') + 1)
              return fileIdSuffixes.includes(itemSuffix) && item.status !== 'sent'
                ? { ...item, status: 'failed' }
                : item
            }),
          )
          setSending(false)
          setStatus('Transfer failed')
          setConnectionState('failed')
          toast.error(error?.message || 'Transfer failed')
          return
        }

        setStatus(`Transfer interrupted. Retrying (${currentAttempt}/${maxAttempts})...`)
        await new Promise((resolve) => setTimeout(resolve, 900))
      }
    }
  }

  const startTransfer = () => performTransfer(files)

  const retrySingleFile = (queueId) => {
    const parts = queueId.split(':')
    const index = parseInt(parts[0], 10)
    const file = files[index]
    if (file) {
      setQueue((current) =>
        current.map((item) => (item.id === queueId ? { ...item, status: 'pending' } : item)),
      )
      performTransfer([file])
    }
  }

  const retryFailedFiles = () => {
    const failedItems = queue.filter((item) => item.status === 'failed')
    const filesToRetry = []

    setQueue((current) =>
      current.map((item) =>
        item.status === 'failed' ? { ...item, status: 'pending' } : item,
      ),
    )

    for (const item of failedItems) {
      const parts = item.id.split(':')
      const index = parseInt(parts[0], 10)
      const file = files[index]
      if (file) {
        filesToRetry.push(file)
      }
    }

    if (filesToRetry.length > 0) {
      performTransfer(filesToRetry)
    }
  }

  const cancelTransfer = () => {
    if (!sending) return
    cancelRef.current = true
    setSending(false)
    setStatus('Cancelling transfer...')
  }

  const copyLink = async () => {
    if (!shareLink) return

    try {
      await navigator.clipboard.writeText(shareLink)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Unable to copy link')
    }
  }

  const copyReceiverToken = async () => {
    if (!receiverToken) return

    try {
      await navigator.clipboard.writeText(receiverToken)
      toast.success('Receiver token copied')
    } catch {
      toast.error('Unable to copy token')
    }
  }

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
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Send Files</h1>
            <ConnectionStatus state={statusTone} message={status} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Establish a secure local WebRTC tunnel to transfer files directly.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] relative z-10">
        
        {/* Left Column: Dropzone & Transfer Details */}
        <div className="space-y-6">
          <div className="glass-panel rounded-[32px] p-6 shadow-xl border border-white/20 dark:border-slate-800/30">
            
            {/* File Drag Zone */}
            <DropZone
              files={files}
              onFilesSelected={(selected) => {
                setFiles(selected)
                if (selected.length > 0) {
                  toast.success(`${selected.length} file(s) queued`)
                }
              }}
            />

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/50 dark:border-slate-800/20 pt-6">
              
              {/* Share Mode Switcher */}
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200/60 bg-slate-100/40 p-1 dark:border-slate-850 dark:bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setShareMode('link')}
                  className={`rounded-xl px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 ${
                    shareMode === 'link'
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400 border border-slate-200/20'
                      : 'text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white'
                  }`}
                >
                  Link Share
                </button>
                <button
                  type="button"
                  onClick={() => setShareMode('nearby')}
                  className={`rounded-xl px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 ${
                    shareMode === 'nearby'
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400 border border-slate-200/20'
                      : 'text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white'
                  }`}
                >
                  Nearby Share
                </button>
              </div>

              {/* Action Trigger Handles */}
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={startSession}
                  disabled={files.length === 0}
                  className="hover-lift flex items-center gap-2 rounded-xl bg-indigo-655 bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-md shadow-indigo-600/10 hover:shadow-indigo-550/30 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300"
                >
                  <span>Prepare Session</span>
                </button>
                
                <button
                  type="button"
                  onClick={startTransfer}
                  disabled={!receiverConnected || files.length === 0 || sending}
                  className="hover-lift flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-md shadow-emerald-600/10 hover:shadow-emerald-550/30 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300"
                >
                  <span>Start Transfer</span>
                </button>

                {queue.some((item) => item.status === 'failed') && (
                  <button
                    type="button"
                    onClick={retryFailedFiles}
                    disabled={!receiverConnected || sending}
                    className="hover-lift flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-md shadow-amber-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300"
                  >
                    <span>Retry Failed</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={cancelTransfer}
                  disabled={!sending}
                  className="rounded-xl border border-rose-250 bg-rose-500/5 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-rose-600 hover:bg-rose-500/10 disabled:opacity-50 dark:border-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-500/5 transition duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Advanced Configs */}
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
                  <span className="font-bold text-slate-500">Signaling WS Endpoint</span>
                  <input
                    value={signalingUrl}
                    onChange={(event) => setSignalingUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-bold text-slate-500">STUN Server URL</span>
                  <input
                    value={stunUrl}
                    onChange={(event) => setStunUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-bold text-slate-500">TURN Relay Server URL</span>
                  <input
                    value={turnUrl}
                    onChange={(event) => setTurnUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-bold text-slate-500">TURN Auth Username</span>
                  <input
                    value={turnUsername}
                    onChange={(event) => setTurnUsername(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="font-bold text-slate-500">TURN Auth Password / Credential</span>
                  <input
                    type="password"
                    value={turnCredential}
                    onChange={(event) => setTurnCredential(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <div className="space-y-2.5 md:col-span-2 border-t border-slate-200/50 dark:border-slate-800/20 pt-4">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">WebRTC Data Chunk Size</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {CHUNK_SIZE_PRESETS_KB.map((preset) => {
                      const isActive = Number(chunkSizeKB) === preset
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setChunkSizeKB(preset)}
                          className={`rounded-xl px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 ${
                            isActive
                              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          {preset} KB
                        </button>
                      )
                    })}
                    <input
                      type="number"
                      min="4"
                      max="1024"
                      value={chunkSizeKB}
                      onChange={(event) => setChunkSizeKB(event.target.value)}
                      className="ml-2 w-20 rounded-xl border border-slate-250 bg-white/60 px-2 py-1.5 text-xs text-center text-slate-850 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">Custom KB</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Connection Details, QR, Link Share */}
        <div className="space-y-6">
          
          {/* Active Session Sharing Panel */}
          <div className="glass-panel rounded-[32px] p-6 shadow-xl space-y-6 border border-white/20 dark:border-slate-800/30 relative overflow-hidden">
            {/* Soft decorative blur */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent blur-md pointer-events-none" />
            <h2 className="text-lg font-bold text-slate-855 dark:text-white">Share Session</h2>
            
            {/* Nearby share code */}
            {shareMode === 'nearby' && (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Nearby Local Code</p>
                <div className="flex gap-2">
                  {(sessionId || '----').padEnd(4, '-').slice(0, 4).split('').map((digit, index) => (
                    <div
                      key={`${digit}-${index}`}
                      className="grid h-12 w-12 place-items-center rounded-xl bg-slate-900 dark:bg-slate-800 text-lg font-extrabold tracking-wide text-white border border-slate-700/30 shadow-md transition duration-300"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-550 dark:text-slate-400 font-semibold leading-relaxed">
                  Receiver can input this 4-digit code directly on the receive page to pair.
                </p>
              </div>
            )}

            <div className="grid gap-3 text-[11px] font-semibold">
              <div className="rounded-2xl bg-slate-100/40 dark:bg-slate-900/30 p-4 border border-slate-200/50 dark:border-slate-800/10">
                <p className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Session Room ID</p>
                <p className="font-mono text-slate-800 dark:text-slate-200 break-all mt-1 font-bold">{sessionId || '-'}</p>
              </div>

              {shareLink && (
                <div className="rounded-2xl bg-slate-100/40 dark:bg-slate-900/30 p-4 border border-slate-200/50 dark:border-slate-800/10 relative group">
                  <p className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Share Link</p>
                  <p className="font-mono text-slate-800 dark:text-slate-200 break-all mt-1 leading-relaxed mr-8">{shareLink}</p>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-200/60 dark:text-slate-500 dark:hover:text-indigo-400 dark:hover:bg-slate-800/50 transition-colors"
                    title="Copy Link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                    </svg>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-100/40 dark:bg-slate-900/30 p-4 border border-slate-200/50 dark:border-slate-800/10">
                  <p className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Lifespan</p>
                  <p className="text-xs font-bold text-slate-850 dark:text-slate-200 mt-1 font-mono">{expiresInLabel}</p>
                </div>
                <div className="rounded-2xl bg-slate-100/40 dark:bg-slate-900/30 p-4 border border-slate-200/50 dark:border-slate-800/10">
                  <p className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Expiry Time</p>
                  <p className="text-xs text-slate-800 dark:text-slate-250 mt-1 truncate">
                    {sessionExpiresAt ? new Date(sessionExpiresAt).toLocaleTimeString() : '-'}
                  </p>
                </div>
              </div>

              {receiverToken && (
                <div className="rounded-2xl bg-slate-100/40 dark:bg-slate-900/30 p-4 border border-slate-200/50 dark:border-slate-800/10 relative group">
                  <p className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Receiver Security Token</p>
                  <p className="font-mono text-slate-800 dark:text-slate-200 truncate mt-1 mr-8 font-bold">{receiverToken}</p>
                  <button
                    type="button"
                    onClick={copyReceiverToken}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-200/60 dark:text-slate-500 dark:hover:text-indigo-400 dark:hover:bg-slate-800/50 transition-colors"
                    title="Copy Token"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* QR display */}
            {shareLink && (
              <div className="flex flex-col items-center justify-center gap-3 border-t border-slate-200/50 dark:border-slate-800/20 pt-6">
                <QRCodeGenerator value={shareLink} />
                <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mt-2">
                  Scan QR code on receiver device
                </p>
              </div>
            )}
          </div>

          {/* Connection Stats & Progress Panel */}
          {files.length > 0 && (
            <div className="glass-panel rounded-[32px] p-6 shadow-xl space-y-5 border border-white/20 dark:border-slate-800/30">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Active Transmission</h2>
              
              <ProgressBar 
                label="Overall Progress" 
                progress={progress} 
                speed={speed} 
                totalBytes={activeTransferSize || totalSize} 
              />

              <ThroughputChart data={speedHistory} />
              
              <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-800/20 pt-4">
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">Route Type</p>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-250 mt-1 font-sans">
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
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">Active Attempt</p>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-250 mt-1 font-mono">
                    {attempt > 0 ? `${attempt} / 2` : 'Idle'}
                  </p>
                </div>
              </div>

              {/* Queue Detail */}
              {queue.length > 0 && (
                <div className="space-y-2 border-t border-slate-200/50 dark:border-slate-800/20 pt-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Transfer Queue</p>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl bg-slate-100/30 p-3 text-xs dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/10 min-w-0"
                      >
                        <span className="max-w-[60%] truncate font-bold text-slate-700 dark:text-slate-350">{item.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`rounded-xl px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider ${
                            item.status === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : item.status === 'sending'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                : item.status === 'failed'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : 'bg-slate-200/50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {item.status}
                          </span>
                          {item.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => retrySingleFile(item.id)}
                              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-indigo-500 transition-all duration-200 active:scale-95"
                              title="Retry sending this file"
                            >
                              Retry
                            </button>
                          )}
                        </div>
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
                <div className="bg-slate-100/30 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/20">
                  <p className="text-slate-400 dark:text-slate-505 text-[9px] uppercase tracking-wider font-extrabold">Smoothed Latency (RTT)</p>
                  <p className="text-sm font-extrabold text-slate-850 dark:text-slate-200 mt-0.5">
                    {benchmark.rttMs} ms
                  </p>
                </div>
                <div className="bg-slate-100/30 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/20">
                  <p className="text-slate-400 dark:text-slate-550 text-[9px] uppercase tracking-wider font-extrabold">Data Channels Used</p>
                  <p className="text-sm font-extrabold text-slate-855 dark:text-slate-200 mt-0.5">
                    {benchmark.activeChannels} / 4 parallel
                  </p>
                </div>
                {benchmark.hashingTimeMs > 0 && (
                  <div className="bg-slate-100/30 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/20 col-span-2">
                    <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider font-extrabold">Hashing Verification Time</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                      {(benchmark.hashingTimeMs / 1000).toFixed(2)}s
                    </p>
                  </div>
                )}
                {benchmark.retransmissions > 0 && (
                  <div className="bg-slate-100/30 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/20 col-span-2">
                    <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider font-extrabold">Packet Retransmissions (NACKs)</p>
                    <p className="text-sm font-extrabold text-rose-500 mt-0.5 font-mono">
                      {benchmark.retransmissions} chunks retransmitted
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
