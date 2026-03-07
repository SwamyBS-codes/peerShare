import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import ConnectionStatus from '../components/ConnectionStatus'
import ProgressBar from '../components/ProgressBar'
import QRCodeGenerator from '../components/QRCodeGenerator'
import { SocketService } from '../services/socketService'
import { WebRTCService } from '../services/webrtcService'

function inferDefaultSignalingUrl() {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3001'
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  if (window.location.port === '5173') {
    return `${wsProtocol}//${window.location.hostname}:3001`
  }

  return `${wsProtocol}//${window.location.host}`
}

const DEFAULT_SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || inferDefaultSignalingUrl()
const DEFAULT_STUN_URL = import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302'
const DEFAULT_TURN_URL = import.meta.env.VITE_TURN_URL || ''
const DEFAULT_TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || ''
const DEFAULT_TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL || ''

function parseShareInput(value) {
  const normalized = typeof value === 'string' ? value : String(value ?? '')
  const trimmed = normalized.trim()
  if (!trimmed) {
    return { sessionId: '', token: '' }
  }

  try {
    const url = new URL(trimmed)
    return {
      sessionId: url.searchParams.get('session')?.trim() || '',
      token: url.searchParams.get('token')?.trim() || '',
    }
  } catch {
    return { sessionId: trimmed, token: '' }
  }
}

export default function ReceiveFile() {
  const initialSession = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('session')?.trim() || ''
  }, [])

  const initialToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('token')?.trim() || ''
  }, [])

  const [signalingUrl, setSignalingUrl] = useState(DEFAULT_SIGNALING_URL)
  const [stunUrl, setStunUrl] = useState(DEFAULT_STUN_URL)
  const [turnUrl, setTurnUrl] = useState(DEFAULT_TURN_URL)
  const [turnUsername, setTurnUsername] = useState(DEFAULT_TURN_USERNAME)
  const [turnCredential, setTurnCredential] = useState(DEFAULT_TURN_CREDENTIAL)
  const [sessionInput, setSessionInput] = useState(initialSession)
  const [nearbyCode, setNearbyCode] = useState(() => {
    const fromUrl = initialSession.match(/^\d{4}$/)
    return fromUrl ? initialSession : ''
  })
  const [status, setStatus] = useState('Paste a share link or session ID')
  const [connectionState, setConnectionState] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [downloads, setDownloads] = useState([])
  const [currentFileName, setCurrentFileName] = useState('')
  const [resumeBadge, setResumeBadge] = useState(null)
  const [connected, setConnected] = useState(false)
  const [sessionToken, setSessionToken] = useState(initialToken)
  const [routeType, setRouteType] = useState('unknown')

  const socketRef = useRef(null)
  const webrtcRef = useRef(null)
  const peerIdRef = useRef(crypto.randomUUID())
  const transferRef = useRef({
    activeTransferId: null,
    files: new Map(),
    currentFileId: null,
    totalReceivedBytes: 0,
    totalBytes: 0,
    bytesWindow: 0,
    tick: performance.now(),
  })

  useEffect(() => {
    return () => {
      socketRef.current?.close()
      webrtcRef.current?.closeAll()
      for (const item of downloads) {
        URL.revokeObjectURL(item.url)
      }
    }
  }, [downloads])

  const iceServers = useMemo(() => {
    const servers = []

    if (stunUrl.trim()) {
      servers.push({ urls: stunUrl.trim() })
    }

    if (turnUrl.trim() && turnUsername.trim() && turnCredential.trim()) {
      servers.push({ urls: turnUrl.trim(), username: turnUsername.trim(), credential: turnCredential.trim() })
    }

    return servers.length ? servers : [{ urls: 'stun:stun.l.google.com:19302' }]
  }, [stunUrl, turnUrl, turnUsername, turnCredential])

  const handleIncomingData = (peerId, data) => {
    const state = transferRef.current

    if (typeof data === 'string') {
      try {
        const payload = JSON.parse(data)

        if (payload.type === 'transfer-start') {
          const incomingTransferId = payload.transferId || null
          if (incomingTransferId && state.activeTransferId !== incomingTransferId) {
            state.files = new Map()
          }

          state.activeTransferId = incomingTransferId
          state.totalBytes = payload.totalBytes
          state.totalReceivedBytes = [...state.files.values()].reduce(
            (sum, entry) => sum + (entry.receivedBytes || 0),
            0,
          )
          state.bytesWindow = 0
          state.tick = performance.now()
          const initialProgress =
            state.totalBytes > 0 ? Math.round((state.totalReceivedBytes / state.totalBytes) * 100) : 0
          setProgress(Math.min(initialProgress, 100))
          setSpeed(0)
          setStatus('Receiving files...')
          setResumeBadge(null)
        }

        if (payload.type === 'file-meta') {
          const existing = state.files.get(payload.id)
          const shouldReuse =
            Boolean(payload.resumeAllowed) &&
            existing &&
            existing.meta?.size === payload.size &&
            existing.meta?.name === payload.name

          if (shouldReuse) {
            state.currentFileId = payload.id
            setCurrentFileName(payload.name)
            if ((existing.receivedBytes || 0) > 0) {
              setResumeBadge({
                name: payload.name,
                resumedBytes: existing.receivedBytes,
                size: payload.size,
              })
            }
            webrtcRef.current?.sendControl(peerId, {
              type: 'file-ack',
              id: payload.id,
              receivedBytes: existing.receivedBytes,
            })
          } else {
            state.files.set(payload.id, {
              meta: payload,
              chunks: [],
              receivedBytes: 0,
              completed: false,
            })
            state.currentFileId = payload.id
            setCurrentFileName(payload.name)
            setResumeBadge(null)
            webrtcRef.current?.sendControl(peerId, {
              type: 'file-ack',
              id: payload.id,
              receivedBytes: 0,
            })
          }
        }

        if (payload.type === 'file-end' && payload.id) {
          const entry = state.files.get(payload.id)
          if (entry && !entry.completed) {
            const fileBlob = new Blob(entry.chunks, {
              type: entry.meta.mime || 'application/octet-stream',
            })
            const url = URL.createObjectURL(fileBlob)

            setDownloads((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                name: entry.meta.name,
                size: entry.meta.size,
                url,
              },
            ])

            entry.completed = true
            toast.success('Received file successfully')
          }

          state.currentFileId = null
          setCurrentFileName('')
          setResumeBadge(null)
        }

        if (payload.type === 'transfer-complete') {
          setProgress(100)
          setStatus('Transfer completed')
          toast.success('Transfer completed')
        }

        if (payload.type === 'transfer-cancelled') {
          setStatus('Sender cancelled transfer')
          toast('Transfer cancelled by sender')
        }
      } catch {
        // Ignore malformed control messages.
      }

      return
    }

    if (!state.currentFileId) {
      return
    }

    const entry = state.files.get(state.currentFileId)
    if (!entry || entry.completed) {
      return
    }

    entry.chunks.push(data)
    entry.receivedBytes += data.byteLength
    state.totalReceivedBytes += data.byteLength
    state.bytesWindow += data.byteLength

    // Send periodic ACKs so sender can resume from last received offset if needed.
    if (entry.receivedBytes % (256 * 1024) <= data.byteLength) {
      webrtcRef.current?.sendControl(peerId, {
        type: 'file-ack',
        id: state.currentFileId,
        receivedBytes: entry.receivedBytes,
      })
    }

    const percent = state.totalBytes > 0 ? Math.round((state.totalReceivedBytes / state.totalBytes) * 100) : 0
    setProgress(Math.min(percent, 100))

    const now = performance.now()
    const elapsed = (now - state.tick) / 1000
    if (elapsed >= 0.6) {
      setSpeed(state.bytesWindow / elapsed)
      state.bytesWindow = 0
      state.tick = now
    }
  }

  const connectToSession = async (rawInput = sessionInput) => {
    const inputValue = typeof rawInput === 'string' ? rawInput : sessionInput
    const { sessionId: parsedSessionId, token: parsedToken } = parseShareInput(inputValue)

    if (!parsedSessionId) {
      toast.error('Enter a valid share link or session ID')
      return
    }

    const isNearbyCode = /^\d{4}$/.test(parsedSessionId)
    const effectiveToken = (parsedToken || sessionToken || '').trim()
    if (!isNearbyCode && !effectiveToken) {
      toast.error('Receiver token is required for this session')
      return
    }

    if (parsedToken && parsedToken !== sessionToken) {
      setSessionToken(parsedToken)
    }

    socketRef.current?.close()
    webrtcRef.current?.closeAll()

    setConnectionState('connecting')
    setConnected(false)
    setStatus('Connecting to sender...')
    setRouteType('unknown')

    const socket = new SocketService({ maxRetries: 4, retryDelayMs: 1200 })
    const webrtc = new WebRTCService(iceServers)

    webrtc.setHandlers({
      onSignal: (targetPeerId, data) => socket.sendSignal(targetPeerId, data),
      onChannelState: (_peerId, state) => {
        if (state === 'open') {
          setConnectionState('connected')
          setConnected(true)
          setStatus('Connected to sender. Waiting for transfer...')
          toast.success('Connected to sender')
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
        }
      },
      onRouteType: (_peerId, nextRouteType) => {
        setRouteType(nextRouteType)
      },
      onData: (_peerId, data) => {
        handleIncomingData(_peerId, data)
      },
    })

    socket.connect({
      signalingUrl,
      roomId: parsedSessionId,
      peerId: peerIdRef.current,
      role: 'receiver',
      token: effectiveToken,
      onOpen: () => {
        setStatus('Connected to signaling server')
      },
      onMessage: async (message) => {
        if (message.type === 'signal') {
          await webrtc.handleSignal(message.fromPeerId, message.data)
        }

        if (message.type === 'peer-left') {
          setConnected(false)
          setConnectionState('idle')
          setStatus('Sender disconnected')
        }
      },
      onClose: () => {
        if (!connected) {
          setStatus('Signaling disconnected. Retrying...')
        }
      },
      onRetry: ({ attempt, delay }) => {
        setStatus(`Signaling reconnect ${attempt}/4 in ${(delay / 1000).toFixed(1)}s...`)
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

  const confirmNearbyCode = async () => {
    const normalizedCode = nearbyCode.replace(/\D/g, '').slice(0, 4)
    if (normalizedCode.length !== 4) {
      toast.error('Enter a valid 4-digit local code')
      return
    }

    setSessionInput(normalizedCode)
    await connectToSession(normalizedCode)
  }

  const statusTone = connectionState === 'connected'
    ? 'connected'
    : connectionState === 'failed'
      ? 'failed'
      : connectionState === 'connecting'
        ? 'connecting'
        : 'idle'

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Receive File</h1>
        <ConnectionStatus state={statusTone} message={status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl transition hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/85">
          <label className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold">Paste share link or session ID</span>
            <input
              value={sessionInput}
              onChange={(event) => setSessionInput(event.target.value)}
              placeholder="https://.../receive?session=abcd1234&token=..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">Signaling URL</span>
              <input
                value={signalingUrl}
                onChange={(event) => setSignalingUrl(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">STUN URL</span>
              <input
                value={stunUrl}
                onChange={(event) => setStunUrl(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">TURN URL (optional)</span>
              <input
                value={turnUrl}
                onChange={(event) => setTurnUrl(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">TURN Username</span>
              <input
                value={turnUsername}
                onChange={(event) => setTurnUsername(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
              <span className="font-semibold">TURN Credential</span>
              <input
                type="password"
                value={turnCredential}
                onChange={(event) => setTurnCredential(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => connectToSession()}
            className="hover-lift mt-5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-sky-500/30"
          >
            Connect to Sender
          </button>

          <label className="mt-4 block space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold">Session Token</span>
            <input
              value={sessionToken}
              onChange={(event) => setSessionToken(event.target.value)}
              placeholder="Token from sender link"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <div className="mt-6 space-y-4">
            <ProgressBar label="Receive Progress" progress={progress} speed={speed} tone="emerald" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {connected ? 'Connected and ready to receive.' : 'Waiting for sender connection...'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Route: <strong>{routeType === 'relay' ? 'Relayed (TURN)' : routeType === 'direct' ? 'Direct P2P' : 'Detecting...'}</strong>
            </p>
            {currentFileName && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Receiving: {currentFileName}
                </p>
                {resumeBadge && (
                  <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Resumed {resumeBadge.name} from{' '}
                    {Math.round((resumeBadge.resumedBytes / resumeBadge.size) * 100)}%
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl transition hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/85">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nearby Share</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Scan the sender QR code or enter the 4-digit local code.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
              Enter the 4 digit local code
            </p>
            <div className="mt-3 flex items-center gap-2">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={nearbyCode[index] || ''}
                  onChange={(event) => {
                    const nextChar = event.target.value.replace(/\D/g, '').slice(-1)
                    setNearbyCode((current) => {
                      const chars = current.padEnd(4, '').split('')
                      chars[index] = nextChar
                      return chars.join('').slice(0, 4)
                    })
                  }}
                  className="h-12 w-12 rounded-lg border border-slate-300 bg-slate-950 text-center text-xl font-bold text-white dark:border-slate-600"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={confirmNearbyCode}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 font-semibold text-white"
            >
              Confirm
            </button>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            Current session input: {sessionInput || '-'}
          </div>

          <div className="flex justify-center">
            <QRCodeGenerator value={sessionInput.startsWith('http') ? sessionInput : ''} />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Downloads</h3>
            {downloads.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No files received yet.</p>
            ) : (
              downloads.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div>
                    <p className="max-w-[180px] truncate font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <a
                    href={file.url}
                    download={file.name}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
