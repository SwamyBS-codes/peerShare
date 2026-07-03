import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import ConnectionStatus from '../components/ConnectionStatus'
import ProgressBar from '../components/ProgressBar'
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
const DEFAULT_TURN_URL = import.meta.env.VITE_TURN_URL || ''
const DEFAULT_TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || ''
const DEFAULT_TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL || ''

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
  const [routeType, setRouteType] = useState('unknown')
  const [joined, setJoined] = useState(false)
  const [downloadedFiles, setDownloadedFiles] = useState([])
  const [queue, setQueue] = useState([])
  
  // UI states
  const [showConfig, setShowConfig] = useState(false)

  const socketRef = useRef(null)
  const webrtcRef = useRef(null)
  const peerIdRef = useRef(crypto.randomUUID())
  const transferRef = useRef({
    id: '',
    files: {},
    totalBytes: 0,
    receivedBytes: 0,
    currentFileId: '',
    currentWriter: null,
  })

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (webrtcRef.current) {
        const openPeers = webrtcRef.current.getOpenPeerIds()
        for (const peerId of openPeers) {
          try {
            webrtcRef.current.sendControl(peerId, { type: 'peer-exited' })
          } catch (e) {
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

  const cleanupCurrentTransfer = () => {
    if (transferRef.current.currentWriter) {
      try {
        transferRef.current.currentWriter.close()
      } catch {
        // Suppress release-lock errors
      }
      transferRef.current.currentWriter = null
    }
  }

  const joinSession = () => {
    if (!sessionId.trim()) {
      toast.error('Session ID is required')
      return
    }

    const cleanedSession = sessionId.trim()
    const cleanedToken = sessionToken.trim()

    setStatus('Connecting to signaling server...')
    setConnectionState('connecting')
    setDownloadedFiles([])
    setQueue([])
    setProgress(0)
    setSpeed(0)
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
          return
        }

        if (data instanceof ArrayBuffer) {
          await handleBinaryChunk(webrtc, peerId, data)
        }
      },
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

  const handleControlMessage = async (webrtc, peerId, payload) => {
    const t = transferRef.current

    if (payload.type === 'transfer-start') {
      cleanupCurrentTransfer()
      t.id = payload.transferId
      t.totalBytes = payload.totalBytes || 0
      t.receivedBytes = 0
      t.files = {}
      t.currentFileId = ''
      setProgress(0)
      setSpeed(0)
      setQueue([])
      setStatus('Transfer starting...')
    }

    if (payload.type === 'file-meta') {
      t.currentFileId = payload.id
      t.files[payload.id] = {
        meta: payload,
        chunks: [],
        received: 0,
      }

      setQueue((curr) => [
        ...curr,
        { id: payload.id, name: payload.name, size: payload.size, status: 'receiving' },
      ])

      setStatus(`Receiving ${payload.name}...`)

      // Acknowledge file metadata reception and return current downloaded offset (0 for start)
      webrtc.sendControl(peerId, {
        type: 'file-ack',
        id: payload.id,
        receivedBytes: 0,
      })
    }

    if (payload.type === 'file-end') {
      const fileEntry = t.files[payload.id]
      if (fileEntry) {
        const blob = new Blob(fileEntry.chunks, { type: fileEntry.meta.mime })
        const url = URL.createObjectURL(blob)

        setDownloadedFiles((curr) => [
          ...curr,
          {
            id: payload.id,
            name: fileEntry.meta.name,
            size: fileEntry.meta.size,
            url,
          },
        ])

        setQueue((curr) =>
          curr.map((item) => (item.id === payload.id ? { ...item, status: 'downloaded' } : item)),
        )

        fileEntry.chunks = []
      }

      t.currentFileId = ''
    }

    if (payload.type === 'transfer-complete') {
      setProgress(100)
      setSpeed(0)
      setStatus('Transfer complete')
      toast.success('All files downloaded')
      cleanupCurrentTransfer()
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

  const handleBinaryChunk = async (webrtc, peerId, chunk) => {
    const t = transferRef.current
    const currentFileId = t.currentFileId
    if (!currentFileId) return

    const fileEntry = t.files[currentFileId]
    if (!fileEntry) return

    fileEntry.chunks.push(chunk)
    fileEntry.received += chunk.byteLength
    t.receivedBytes += chunk.byteLength

    const percent = t.totalBytes > 0 ? Math.round((t.receivedBytes / t.totalBytes) * 100) : 0
    setProgress(percent)

    // Rough speed calculation from data frequency
    const now = performance.now()
    if (!t.lastSpeedCalc) {
      t.lastSpeedCalc = now
      t.bytesThisCalc = 0
    }
    t.bytesThisCalc += chunk.byteLength
    const diff = (now - t.lastSpeedCalc) / 1000
    if (diff >= 0.7) {
      setSpeed(t.bytesThisCalc / diff)
      t.bytesThisCalc = 0
      t.lastSpeedCalc = now
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

  const totalSize = transferRef.current.totalBytes

  const statusTone = connectionState === 'connected'
    ? 'connected'
    : connectionState === 'failed'
      ? 'failed'
      : connectionState === 'connecting'
        ? 'connecting'
        : 'idle'

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 md:px-6 animate-fadeIn">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/40 dark:border-slate-800/30 pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Receive Files</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Join a sharing session to download files directly.</p>
        </div>
        <ConnectionStatus state={statusTone} message={status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        
        {/* Pairing Portal & Connection Config */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 shadow-md space-y-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Pairing Details</h2>

            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Session Room ID</span>
                <input
                  placeholder="Enter 4-digit code or UUID"
                  value={sessionId}
                  onChange={(event) => setSessionId(event.target.value)}
                  disabled={joined && connectionState === 'connected'}
                  className="w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 font-semibold text-slate-850 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 disabled:opacity-50"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Security Token (Optional)</span>
                <input
                  placeholder="Enter session token (if required)"
                  type="password"
                  value={sessionToken}
                  onChange={(event) => setSessionToken(event.target.value)}
                  disabled={joined && connectionState === 'connected'}
                  className="w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 font-semibold text-slate-850 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 disabled:opacity-50"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={joinSession}
                  disabled={joined && connectionState === 'connected'}
                  className="hover-lift flex-grow flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  <span>Connect Session</span>
                </button>

                {joined && (
                  <button
                    type="button"
                    onClick={cancelTransfer}
                    className="rounded-2xl border border-rose-200 bg-rose-500/5 px-5 py-3.5 font-bold text-rose-600 hover:bg-rose-500/10 dark:border-rose-900/30 dark:text-rose-450 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Config accordion */}
          <div className="glass-panel rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between px-6 py-4 font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition"
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Advanced RTC Settings</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition duration-300 ${showConfig ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showConfig && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-200/50 dark:border-slate-800/20 grid gap-4 md:grid-cols-2 text-sm">
                <label className="space-y-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Signaling WS Endpoint</span>
                  <input
                    value={signalingUrl}
                    onChange={(event) => setSignalingUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400">STUN Server URL</span>
                  <input
                    value={stunUrl}
                    onChange={(event) => setStunUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400">TURN Relay Server URL</span>
                  <input
                    value={turnUrl}
                    onChange={(event) => setTurnUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400">TURN Auth Username</span>
                  <input
                    value={turnUsername}
                    onChange={(event) => setTurnUsername(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="font-bold text-slate-600 dark:text-slate-400">TURN Auth Password / Credential</span>
                  <input
                    type="password"
                    value={turnCredential}
                    onChange={(event) => setTurnCredential(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Download lists, route tracking, queues */}
        <div className="space-y-6">
          {joined && (
            <div className="glass-panel rounded-3xl p-6 shadow-md space-y-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Active Transmission</h2>
              
              <ProgressBar 
                label="Overall Progress" 
                progress={progress} 
                speed={speed} 
                totalBytes={totalSize}
              />

              <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-800/20 pt-4">
                <div>
                  <p>Route Type</p>
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
                  <p>Total Size</p>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-250 mt-1 font-mono">
                    {totalSize > 0 ? formatSize(totalSize) : '-'}
                  </p>
                </div>
              </div>

              {/* Active Queue status */}
              {queue.length > 0 && (
                <div className="space-y-2 border-t border-slate-200/50 dark:border-slate-800/20 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Files Queue</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50/50 p-3 text-xs dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/10"
                      >
                        <span className="max-w-[65%] truncate font-medium text-slate-705 dark:text-slate-350">{item.name}</span>
                        <span className={`rounded-xl px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                          item.status === 'downloaded'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : item.status === 'receiving'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : item.status === 'failed'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-450'
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

          {/* Downloaded Files Panel */}
          <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4">
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
                    className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 hover:border-indigo-500/20 dark:hover:border-indigo-400/20 transition-all duration-200"
                  >
                    <div className="max-w-[70%]">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-sm">{file.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{formatSize(file.size)}</p>
                    </div>
                    
                    <a
                      href={file.url}
                      download={file.name}
                      className="hover-lift flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition duration-200"
                    >
                      <span>Download</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
