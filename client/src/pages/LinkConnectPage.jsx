import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import BrandMark from '../components/BrandMark'
import { LinkSharePanel } from '../components/Chat/LinkSharePanel'
import { authService } from '../services/authService'
import { useSignalingSocket } from '../hooks/useSignalingSocket'
import { useWebRTCLinkFile } from '../hooks/useWebRTCLinkFile'

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export default function LinkConnectPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const normalizedCode = useMemo(() => String(code || '').trim().toLowerCase(), [code])
  const currentUser = authService.getCurrentUser()

  const [joining, setJoining] = useState(false)
  const [linkSession, setLinkSession] = useState(null)
  const [joinError, setJoinError] = useState('')
  const fileSignalRef = useRef(() => {})

  const wsRef = useSignalingSocket((msg) => {
    switch (msg.type) {
      case 'link-connected':
        setJoining(false)
        setJoinError('')
        setLinkSession({
          code: msg.code,
          role: msg.role,
          peerUserId: msg.peerUserId,
        })
        toast.success(`Connected with @${msg.peerUserId}`)
        break
      case 'link-error':
        setJoining(false)
        setJoinError(msg.message || 'Could not join this link.')
        toast.error(msg.message || 'Could not join this link.')
        break
      case 'link-closed':
        setLinkSession(null)
        toast(msg.reason || 'Session ended', { icon: '🔗' })
        break
      case 'link-signal':
        if (msg.data?.channelType === 'file') {
          fileSignalRef.current(msg.fromUserId, msg.data)
        }
        break
      default:
        break
    }

    if (msg.type === 'error') {
      toast.error(msg.message || 'Connection error')
    }
  })

  const {
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
  } = useWebRTCLinkFile({ wsRef, toast, iceServers })

  useEffect(() => {
    fileSignalRef.current = handleLinkFileSignaling
  }, [handleLinkFileSignaling])

  useEffect(() => {
    if (linkSession) {
      setSession(linkSession)
    }
  }, [linkSession, setSession])

  const connect = () => {
    if (!normalizedCode) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Signaling not ready — try again in a moment.')
      return
    }
    setJoining(true)
    setJoinError('')
    wsRef.current.send(JSON.stringify({ type: 'link-join', code: normalizedCode }))
  }

  const closeSession = () => {
    cleanupTransfer()
    setLinkSession(null)
    navigate('/', { replace: true })
  }

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec) return '0 B/s'
    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s']
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k))
    return `${parseFloat((bytesPerSec / k ** i).toFixed(2))} ${sizes[i]}`
  }

  if (!currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(`/link/${normalizedCode}`)}`} replace />
  }

  if (!normalizedCode || normalizedCode.length < 6) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-chat-muted">Invalid share link.</p>
        <Link to="/" className="text-sm font-semibold text-chat-accent hover:underline">
          Back to chats
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-chat-sidebar px-4 py-10 dark:bg-chat-sidebarDark">
      <div className="mb-8 flex items-center gap-2">
        <BrandMark className="h-8 w-8" />
        <span className="text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">PeerShare link</span>
      </div>

      {!linkSession ? (
        <div className="w-full max-w-md rounded-2xl border border-chat-border bg-white p-6 shadow-lg dark:border-chat-borderDark dark:bg-chat-headerDark">
          <h1 className="text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">Join file exchange</h1>
          <p className="mt-2 text-sm text-chat-muted dark:text-chat-mutedDark">
            You&apos;re signed in as <strong>@{currentUser.userId}</strong>. Connect to start sending files peer-to-peer with the link host.
          </p>
          <p className="mt-4 rounded-lg bg-black/5 px-3 py-2 font-mono text-sm dark:bg-white/5">{normalizedCode}</p>
          {joinError ? <p className="mt-3 text-sm text-chat-danger">{joinError}</p> : null}
          <button
            type="button"
            onClick={connect}
            disabled={joining}
            className="mt-6 w-full rounded-xl bg-chat-accent py-3 text-sm font-semibold text-white hover:bg-chat-accentHover disabled:opacity-60"
          >
            {joining ? 'Connecting…' : 'Connect'}
          </button>
          <Link to="/" className="mt-4 block text-center text-sm text-chat-muted hover:text-chat-accent">
            Go to messenger
          </Link>
        </div>
      ) : null}

      <LinkSharePanel
        session={linkSession}
        onClose={closeSession}
        sendFile={sendFile}
        transferState={transferState}
        transferFileName={transferFileName}
        transferProgress={transferProgress}
        transferSpeed={transferSpeed}
        cancelTransfer={cancelTransfer}
        formatSize={formatSize}
        formatSpeed={formatSpeed}
        receivedFiles={receivedFiles}
      />
    </div>
  )
}
