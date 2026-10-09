import React from 'react'
import { IconClose, IconMic, IconVideo } from '../icons/MessageIcons'

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

export function VideoCallOverlay({
  activeCall,
  localStream,
  remoteStream,
  micMuted,
  camOff,
  speakerMuted,
  cameraFacingMode,
  toggleMic,
  toggleCam,
  switchCameraFacingMode,
  toggleSpeaker,
  endCall,
}) {
  const localVideoRef = React.useRef(null)
  const remoteVideoRef = React.useRef(null)
  const remoteAudioRef = React.useRef(null)

  React.useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream
  }, [localStream])

  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream

    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.play().catch(() => {})
    }

    if (remoteAudioRef.current && remoteStream && !speakerMuted) {
      remoteAudioRef.current.play().catch(() => {})
    }
  }, [remoteStream, speakerMuted])

  if (!activeCall || (!localStream && !remoteStream)) return null
  const connecting = !remoteStream
  const isAudio = activeCall.callMode === 'audio'

  return (
    <div className="fixed inset-0 z-[60] flex min-h-[100dvh] flex-col bg-ps-auth text-[#e8eaef]">
      <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-base font-medium">{activeCall.friendUserId}</p>
          <p className="text-xs text-chat-mutedDark">
            {connecting ? 'Ringing…' : isAudio ? 'Voice call' : 'End-to-end encrypted'}
          </p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
            connecting ? 'bg-amber-500/15 text-amber-200' : 'bg-chat-accent/20 text-chat-accentLight'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${connecting ? 'animate-pulse bg-amber-300' : 'bg-chat-accentLight'}`} />
          {connecting ? 'Connecting' : 'Live'}
        </span>
      </header>

      <main className="relative mx-3 mb-3 flex flex-1 overflow-hidden rounded-xl border border-indigo-400/15 bg-chat-headerDark sm:mx-6">
        {remoteStream ? (
          <>
            {!isAudio && (
              <video ref={remoteVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            )}
            <audio ref={remoteAudioRef} autoPlay playsInline muted={speakerMuted} />
            {isAudio && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-chat-accent/20 text-3xl font-semibold text-chat-accentLight">
                  {(activeCall.friendUserId || '?').slice(0, 2).toUpperCase()}
                </div>
                <p className="text-sm text-chat-mutedDark">@{activeCall.friendUserId}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-chat-accent/20 text-2xl font-semibold text-chat-accentLight">
              {(activeCall.friendUserId || '?').slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm text-chat-mutedDark">Waiting for {activeCall.friendUserId}…</p>
          </div>
        )}
        {localStream && !isAudio && (
          <div className="absolute bottom-3 right-3 aspect-[3/4] w-24 overflow-hidden rounded-lg border-2 border-white/20 bg-black shadow-lg sm:bottom-4 sm:right-4 sm:w-36 sm:aspect-video">
            {!camOff && <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />}
            {camOff && (
              <div className="flex h-full items-center justify-center text-center text-[10px] font-medium text-chat-mutedDark">
                Camera off
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="safe-bottom flex shrink-0 items-center justify-center gap-4 px-4 pb-6 pt-2">
        <ControlButton title={micMuted ? 'Unmute' : 'Mute'} onClick={toggleMic} active={!micMuted}>
          <IconMic className={`h-5 w-5 ${micMuted ? 'opacity-50' : ''}`} />
        </ControlButton>
        {!isAudio && (
          <>
            <ControlButton title={camOff ? 'Camera on' : 'Camera off'} onClick={toggleCam} active={!camOff}>
              <IconVideo className={`h-5 w-5 ${camOff ? 'opacity-50' : ''}`} />
            </ControlButton>
            <ControlButton
              title="Switch camera"
              onClick={() => switchCameraFacingMode(cameraFacingMode === 'user' ? 'environment' : 'user')}
              active
            >
              <span className="text-xs font-bold">{cameraFacingMode === 'user' ? 'F' : 'B'}</span>
            </ControlButton>
          </>
        )}
        <ControlButton title={speakerMuted ? 'Speaker on' : 'Speaker off'} onClick={toggleSpeaker} active={!speakerMuted}>
          <span className="text-xs font-bold">S</span>
        </ControlButton>
        <ControlButton title="End call" onClick={endCall} danger>
          <IconClose className="h-5 w-5" />
        </ControlButton>
      </nav>
    </div>
  )
}
