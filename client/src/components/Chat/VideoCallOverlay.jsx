import React from 'react';

function ControlButton({ label, title, onClick, active, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`group flex min-w-[72px] flex-col items-center gap-2 rounded-2xl px-2 py-2 text-center transition duration-200 active:scale-95 ${danger ? 'text-white' : 'text-slate-100'}`}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full border text-lg font-bold shadow-lg transition ${danger
          ? 'border-rose-500/40 bg-rose-500 text-white shadow-rose-500/25 hover:bg-rose-400'
          : active
            ? 'border-white/15 bg-white text-slate-950 shadow-white/10 hover:bg-slate-100'
            : 'border-white/10 bg-white/10 text-white hover:bg-white/15'}`}
      >
        {children}
      </span>
      <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${danger ? 'text-rose-200' : active ? 'text-slate-200' : 'text-slate-300'}`}>
        {label}
      </span>
    </button>
  );
}

export function VideoCallOverlay({ activeCall, localStream, remoteStream, micMuted, camOff, speakerMuted, toggleMic, toggleCam, toggleSpeaker, endCall }) {
  const localVideoRef = React.useRef(null);
  const remoteVideoRef = React.useRef(null);
  React.useEffect(() => { if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream; }, [localStream]);
  React.useEffect(() => { if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream]);
  if (!activeCall || (!localStream && !remoteStream)) return null;
  const connecting = !remoteStream;

  return <div className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-[#090b14] p-3 text-white sm:p-6">
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 backdrop-blur-xl sm:px-4">
      <div className="min-w-0"><p className="truncate text-sm font-bold">@{activeCall.friendUserId}</p><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{connecting ? 'Calling securely…' : 'Encrypted video call'}</p></div>
      <span className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold ${connecting ? 'bg-amber-400/10 text-amber-300' : 'bg-emerald-400/10 text-emerald-300'}`}><span className={`h-2 w-2 rounded-full ${connecting ? 'animate-pulse bg-amber-300' : 'bg-emerald-300'}`} />{connecting ? 'Connecting' : 'Live'}</span>
    </header>
    <main className="relative mx-auto my-3 flex w-full max-w-6xl flex-1 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl sm:my-5">
      {remoteStream ? <video ref={remoteVideoRef} autoPlay playsInline muted={speakerMuted} className="h-full w-full object-cover" /> : <div className="flex flex-col items-center gap-4 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-2xl animate-pulse">◌</span><div><p className="font-bold">Waiting for @{activeCall.friendUserId}</p><p className="mt-1 text-xs text-slate-400">They have 45 seconds to answer.</p></div></div>}
      {localStream && <div className="absolute bottom-3 right-3 aspect-[3/4] w-24 overflow-hidden rounded-2xl border border-white/20 bg-slate-950 shadow-2xl sm:bottom-5 sm:right-5 sm:w-40 sm:aspect-video">{!camOff && <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />}{camOff && <div className="flex h-full items-center justify-center text-center text-[10px] font-bold text-slate-400">Camera<br />off</div>}<span className="absolute bottom-1.5 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[8px] font-bold">You</span></div>}
    </main>
    <nav className="mx-auto flex w-full max-w-lg items-center justify-center gap-2 rounded-[26px] border border-white/10 bg-slate-900/85 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:gap-3">
      <ControlButton label={micMuted ? 'Unmute' : 'Mute'} title={micMuted ? 'Turn microphone on' : 'Turn microphone off'} onClick={toggleMic} active={!micMuted}>M</ControlButton>
      <ControlButton label={camOff ? 'Camera' : 'Camera'} title={camOff ? 'Turn camera on' : 'Turn camera off'} onClick={toggleCam} active={!camOff}>{camOff ? 'C' : 'C'}</ControlButton>
      <ControlButton label={speakerMuted ? 'Audio' : 'Audio'} title={speakerMuted ? 'Turn speaker on' : 'Turn speaker off'} onClick={toggleSpeaker} active={!speakerMuted}>S</ControlButton>
      <ControlButton label="End" title="End call" onClick={endCall} danger>✕</ControlButton>
    </nav>
  </div>;
}
