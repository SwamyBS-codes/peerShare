import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import ConnectionStatus from '../components/ConnectionStatus'
import DropZone from '../components/DropZone'
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
const CHUNK_SIZE_PRESETS_KB = [32, 64, 128, 256, 512]
const INITIAL_SHARE_MODE =
  new URLSearchParams(window.location.search).get('mode') === 'nearby' ? 'nearby' : 'link'

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
  const [chunkSizeKB, setChunkSizeKB] = useState(64)
  const [sending, setSending] = useState(false)
  const [sessionToken, setSessionToken] = useState('')
  const [receiverToken, setReceiverToken] = useState('')
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null)
  const [expiresInLabel, setExpiresInLabel] = useState('-')
  const [routeType, setRouteType] = useState('unknown')
  const [queue, setQueue] = useState([])
  const [attempt, setAttempt] = useState(0)

  const socketRef = useRef(null)
  const webrtcRef = useRef(null)
  const cancelRef = useRef(false)
  const peerIdRef = useRef(crypto.randomUUID())

  useEffect(() => {
    return () => {
      socketRef.current?.close()
      webrtcRef.current?.closeAll()
    }
  }, [])

  useEffect(() => {
    if (!sessionExpiresAt) {
      setExpiresInLabel('-')
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

    updateCountdown()
    const timerId = setInterval(updateCountdown, 1000)
    return () => clearInterval(timerId)
  }, [sessionExpiresAt])

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])

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
      body: JSON.stringify({ roomId }),
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
      setSessionToken(senderToken)
      setReceiverToken(receiverToken)
      setSessionExpiresAt(created.expiresAt || null)
    } catch (error) {
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
    setRouteType('unknown')
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
          setStatus('Receiver disconnected')
          setConnectionState('idle')
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

  const startTransfer = async () => {
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
    setStatus(`Starting transfer with ${Math.floor(chunkSizeBytes / 1024)} KB chunks...`)

    const maxAttempts = 2
    for (let currentAttempt = 1; currentAttempt <= maxAttempts; currentAttempt += 1) {
      setAttempt(currentAttempt)

      try {
        await webrtcRef.current.sendFiles(
          peerId,
          files,
          (value) => setProgress(value),
          (bytesPerSec) => setSpeed(bytesPerSec),
          (message) => setStatus(message),
          () => cancelRef.current,
          chunkSizeBytes,
          (fileId, fileStatus, fileMeta) => {
            setQueue((current) =>
              current.map((item) =>
                item.id === fileId
                  ? { ...item, status: fileStatus, name: fileMeta?.name || item.name }
                  : item,
              ),
            )
          },
        )
        setSending(false)
        if (!cancelRef.current) {
          toast.success('All files sent')
        }
        return
      } catch (error) {
        if (currentAttempt >= maxAttempts || cancelRef.current) {
          setQueue((current) =>
            current.map((item) => (item.status === 'sent' ? item : { ...item, status: 'failed' })),
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
      toast.success('Link copied')
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
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Send File</h1>
        <ConnectionStatus state={statusTone} message={status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl transition hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/85">
          <DropZone
            files={files}
            onFilesSelected={(selected) => {
              setFiles(selected)
              if (selected.length > 0) {
                toast.success(`${selected.length} file(s) selected`)
              }
            }}
          />

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
            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
              <span className="font-semibold">Chunk Size (KB)</span>
              <input
                type="number"
                min="4"
                max="1024"
                step="4"
                value={chunkSizeKB}
                onChange={(event) => setChunkSizeKB(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {CHUNK_SIZE_PRESETS_KB.map((preset) => {
                  const isActive = Number(chunkSizeKB) === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setChunkSizeKB(preset)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/35'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset} KB
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try 64-256 KB for large files. Smaller chunks improve reliability on weak networks.
              </p>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/70">
              <button
                type="button"
                onClick={() => setShareMode('link')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  shareMode === 'link'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                Link Mode
              </button>
              <button
                type="button"
                onClick={() => setShareMode('nearby')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  shareMode === 'nearby'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                Nearby Share
              </button>
            </div>

            <button
              type="button"
              onClick={startSession}
              className="hover-lift rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-sky-500/30 transition"
            >
              Generate Link + QR
            </button>
            <button
              type="button"
              onClick={startTransfer}
              disabled={!receiverConnected || files.length === 0 || sending}
              className="hover-lift rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              Start Transfer
            </button>
            <button
              type="button"
              onClick={cancelTransfer}
              disabled={!sending}
              className="rounded-xl border border-rose-300 px-5 py-2.5 font-semibold text-rose-600 dark:border-rose-700 dark:text-rose-300"
            >
              Cancel
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <ProgressBar label="Transfer Progress" progress={progress} speed={speed} />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Files: <strong>{files.length}</strong> | Total size: <strong>{(totalSize / 1024 / 1024).toFixed(2)} MB</strong>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Route: <strong>{routeType === 'relay' ? 'Relayed (TURN)' : routeType === 'direct' ? 'Direct P2P' : 'Detecting...'}</strong>
              {attempt > 0 ? <span> | Attempt: <strong>{attempt}</strong></span> : null}
            </p>

            {queue.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Transfer Queue</h3>
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <span className="max-w-[75%] truncate text-slate-700 dark:text-slate-200">{item.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.status === 'sent'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : item.status === 'sending'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                          : item.status === 'failed'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl transition hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/85">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Share Session</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Share this link or QR code with the receiver.</p>

          {shareMode === 'nearby' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Nearby local code</p>
              <div className="mt-3 flex items-center gap-2">
                {(sessionId || '----').padEnd(4, '-').slice(0, 4).split('').map((digit, index) => (
                  <div
                    key={`${digit}-${index}`}
                    className="grid h-11 w-11 place-items-center rounded-lg bg-slate-900 text-lg font-black tracking-wide text-white"
                  >
                    {digit}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Receiver can enter this 4-digit code for quick nearby connection.
              </p>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <p className="font-semibold text-slate-700 dark:text-slate-100">Session ID</p>
            <p className="break-all text-slate-600 dark:text-slate-300">{sessionId || '-'}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <p className="font-semibold text-slate-700 dark:text-slate-100">Share Link</p>
            <p className="break-all text-slate-600 dark:text-slate-300">{shareLink || 'Generate a session to create link'}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <p className="font-semibold text-slate-700 dark:text-slate-100">Session Expiry</p>
            <p className="text-slate-600 dark:text-slate-300">{expiresInLabel}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <p className="font-semibold text-slate-700 dark:text-slate-100">Receiver Token</p>
            <p className="break-all text-slate-600 dark:text-slate-300">{receiverToken || '-'}</p>
          </div>

          <button
            type="button"
            onClick={copyLink}
            disabled={!shareLink}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Copy Link
          </button>

          <button
            type="button"
            onClick={copyReceiverToken}
            disabled={!receiverToken}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Copy Receiver Token
          </button>

          <div className="flex justify-center">
            <QRCodeGenerator value={shareLink} />
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Keep this page open while sending files.
          </p>
        </aside>
      </div>
    </section>
  )
}
