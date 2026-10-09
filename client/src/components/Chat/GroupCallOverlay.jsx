import React from 'react'
import { IconClose, IconMic } from '../icons/MessageIcons'

function ControlButton({ title, onClick, active, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition active:scale-95 ${
        danger
          ? 'bg-chat-danger text-white hover:bg-red-600'
          : active
            ? 'bg-white text-[#111b21] hover:bg-white/90'
            : 'bg-white/15 text-white hover:bg-white/25'
      }`}
    >
      {children}
    </button>
  )
}

function RemoteTile({ userId, stream, isVideo }) {
  const videoRef = React.useRef(null)
  const audioRef = React.useRef(null)

  React.useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
    if (audioRef.current && stream) audioRef.current.srcObject = stream
  }, [stream])

  return (
    <div className="relative aspect-video min-h-[120px] overflow-hidden rounded-lg bg-chat-pane">
      {isVideo && stream ? (
        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-chat-accent/25 text-lg font-semibold text-chat-accentLight">
            {(userId || '?').slice(0, 2).toUpperCase()}
          </div>
          <p className="truncate text-xs text-chat-mutedDark">@{userId}</p>
        </div>
      )}
      <audio ref={audioRef} autoPlay playsInline />
      <span className="absolute bottom-1 left-2 truncate rounded bg-black/50 px-2 py-0.5 text-[10px]">@{userId}</span>
    </div>
  )
}

export function GroupCallOverlay({
  activeGroupCall,
  localStream,
  remotePeers,
  micMuted,
  toggleMic,
  endGroupCall,
}) {
  const localVideoRef = React.useRef(null)
  const isVideo = activeGroupCall?.callMode !== 'audio'

  React.useEffect(() => {
    if (localVideoRef.current && localStream && isVideo) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, isVideo])

  if (!activeGroupCall || !localStream) return null

  return (
    <div className="fixed inset-0 z-[60] flex min-h-[100dvh] flex-col bg-ps-auth text-[#e8eaef]">
      <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-base font-medium">{activeGroupCall.groupName || 'Group call'}</p>
          <p className="text-xs text-chat-mutedDark">
            {remotePeers.length ? `${remotePeers.length + 1} connected` : 'Waiting for others…'}
          </p>
        </div>
        <span className="rounded-full bg-chat-accent/20 px-3 py-1 text-[11px] font-semibold text-chat-accentLight">
          {isVideo ? 'Video' : 'Voice'} · Group
        </span>
      </header>

      <main className="mx-3 mb-3 grid flex-1 grid-cols-1 gap-2 overflow-y-auto sm:mx-6 sm:grid-cols-2 lg:grid-cols-3">
        {remotePeers.map(({ userId, stream }) => (
          <RemoteTile key={userId} userId={userId} stream={stream} isVideo={isVideo} />
        ))}
        <div className="relative aspect-video min-h-[120px] overflow-hidden rounded-lg border-2 border-chat-accent/40 bg-chat-headerDark">
          {isVideo && localStream ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-chat-mutedDark">You (mic)</div>
          )}
          <span className="absolute bottom-1 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px]">You</span>
        </div>
      </main>

      <nav className="safe-bottom flex shrink-0 items-center justify-center gap-4 px-4 pb-6 pt-2">
        <ControlButton title={micMuted ? 'Unmute' : 'Mute'} onClick={toggleMic} active={!micMuted}>
          <IconMic className={`h-5 w-5 ${micMuted ? 'opacity-50' : ''}`} />
        </ControlButton>
        <ControlButton title="Leave call" onClick={endGroupCall} danger>
          <IconClose className="h-5 w-5" />
        </ControlButton>
      </nav>
    </div>
  )
}
