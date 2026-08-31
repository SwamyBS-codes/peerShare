import React from 'react';

export function VideoCallOverlay({
  activeCall,
  localStream,
  remoteStream,
  micMuted,
  camOff,
  toggleMic,
  toggleCam,
  endCall,
  friendUserId
}) {
  const localVideoRef = React.useRef(null);
  const remoteVideoRef = React.useRef(null);

  React.useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall || (!localStream && !remoteStream)) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-50 flex flex-col justify-between p-6 select-none">
      
      {/* Call Header */}
      <div className="flex justify-between items-center relative z-10">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
          Direct Peer Link: @{activeCall.friendUserId}
        </span>
        <span className="flex items-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
          WebRTC P2P Active
        </span>
      </div>

      {/* Videos Grid */}
      <div className="relative flex-grow flex items-center justify-center my-6 rounded-[24px] overflow-hidden bg-slate-900 border border-slate-800 shadow-inner">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 font-bold gap-3">
            <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs">Connecting remote peer stream...</span>
          </div>
        )}

        {/* Local Feed PIP */}
        {localStream && (
          <div className="absolute bottom-5 right-5 w-36 sm:w-44 aspect-[4/3] rounded-xl overflow-hidden border border-slate-750 shadow-2xl bg-slate-950">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${camOff ? 'hidden' : ''}`}
            />
            {camOff && (
              <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-550 font-bold uppercase tracking-wider">
                Camera Disabled
              </div>
            )}
          </div>
        )}
      </div>

      {/* Call Controls Dock */}
      <div className="flex justify-center items-center gap-3.5 relative z-10">
        {/* Mic Toggle Button */}
        <button
          onClick={toggleMic}
          className={`p-3.5 rounded-full border transition active:scale-90 ${
            micMuted
              ? 'bg-rose-500/10 border-rose-500/25 text-rose-500 hover:bg-rose-500/20'
              : 'bg-white/10 border-slate-800 text-slate-100 hover:bg-white/15'
          }`}
          title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        </button>

        {/* Camera Toggle Button */}
        <button
          onClick={toggleCam}
          className={`p-3.5 rounded-full border transition active:scale-90 ${
            camOff
              ? 'bg-rose-500/10 border-rose-500/25 text-rose-500 hover:bg-rose-500/20'
              : 'bg-white/10 border-slate-800 text-slate-100 hover:bg-white/15'
          }`}
          title={camOff ? 'Enable Camera' : 'Disable Camera'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </button>

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 active:scale-90 transition flex items-center justify-center"
          title="Hang Up"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
          </svg>
        </button>
      </div>

    </div>
  );
}
