import React from 'react'

export function FileTransferOverlay({
  transferState,
  transferFileName,
  transferProgress,
  transferSpeed,
  cancelFileTransfer,
  formatSpeed,
}) {
  if (!transferState) return null

  const active = ['connecting', 'sending', 'receiving'].includes(transferState)

  return (
    <div className="mx-3 mb-2 rounded-lg border border-chat-border bg-white/95 px-3 py-2.5 text-xs shadow-sm backdrop-blur-sm dark:border-chat-borderDark dark:bg-chat-headerDark/95">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 font-medium text-[#111b21] dark:text-[#e9edef]">
          {active && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-chat-accentLight" />}
          <span className="truncate">
            {transferState === 'connecting' && 'Connecting peer channel…'}
            {transferState === 'sending' && `Sending ${transferFileName}`}
            {transferState === 'receiving' && `Receiving ${transferFileName}`}
            {transferState === 'completed' && 'Transfer complete'}
            {transferState === 'failed' && 'Transfer failed'}
          </span>
        </div>
        {active && (
          <button
            type="button"
            onClick={cancelFileTransfer}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-chat-danger hover:bg-chat-danger/10"
          >
            Cancel
          </button>
        )}
      </div>

      {['sending', 'receiving'].includes(transferState) && (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-chat-border dark:bg-chat-borderDark">
            <div
              className="h-full rounded-full bg-chat-accent transition-all duration-300"
              style={{ width: `${transferProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-chat-muted dark:text-chat-mutedDark">
            <span>{transferProgress}%</span>
            <span>{formatSpeed ? formatSpeed(transferSpeed) : `${transferSpeed} B/s`}</span>
          </div>
        </div>
      )}
    </div>
  )
}
