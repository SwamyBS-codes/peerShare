import React from 'react';

export function FileTransferOverlay({
  transferState,
  transferFileName,
  transferProgress,
  transferSpeed,
  cancelFileTransfer,
  formatSpeed
}) {
  if (!transferState) return null;

  return (
    <div className="mx-4 mb-2 p-3.5 rounded-2xl bg-slate-900/90 backdrop-blur border border-indigo-500/20 text-xs shadow-xl animate-fade-in">
      <div className="flex justify-between items-center mb-1.5">
        <div className="font-extrabold text-slate-100 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          {transferState === 'connecting' && 'Establishing direct P2P tunnel...'}
          {transferState === 'sending' && `Sending: ${transferFileName}`}
          {transferState === 'receiving' && `Receiving: ${transferFileName}`}
          {transferState === 'completed' && 'Transfer completed successfully!'}
          {transferState === 'failed' && 'Transfer failed or cancelled.'}
        </div>
        {['connecting', 'sending', 'receiving'].includes(transferState) && (
          <button
            type="button"
            onClick={cancelFileTransfer}
            className="text-[10px] uppercase font-black tracking-wider text-rose-500 hover:text-rose-400 bg-rose-950/20 border border-rose-500/20 px-2.5 py-1 rounded-xl transition"
          >
            Cancel
          </button>
        )}
      </div>

      {['sending', 'receiving'].includes(transferState) && (
        <div className="space-y-1.5">
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${transferProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>{transferProgress}%</span>
            <span>Speed: {formatSpeed ? formatSpeed(transferSpeed) : `${transferSpeed} B/s`}</span>
          </div>
        </div>
      )}
    </div>
  );
}
