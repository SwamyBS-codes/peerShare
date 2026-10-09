import React from 'react'
import { IconPhone, IconVideo } from '../icons/MessageIcons'

export function IncomingGroupCallBanner({ invite, onAccept, onDecline }) {
  if (!invite) return null

  const isVideo = (invite.mediaType || 'video') !== 'audio'

  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-3 safe-top">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-chat-border bg-chat-sidebar p-4 shadow-xl dark:border-chat-borderDark dark:bg-chat-headerDark">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-chat-accent/15 text-chat-accent dark:text-chat-accentLight">
          {isVideo ? <IconVideo className="h-5 w-5" /> : <IconPhone className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
            Group {isVideo ? 'video' : 'voice'} call
          </p>
          <p className="truncate text-xs text-chat-muted dark:text-chat-mutedDark">
            {invite.groupName} · from @{invite.hostUserId}
          </p>
        </div>
        <button type="button" onClick={onDecline} className="rounded-lg px-3 py-2 text-xs font-semibold text-chat-muted hover:bg-black/5 dark:hover:bg-white/10">
          Decline
        </button>
        <button type="button" onClick={onAccept} className="rounded-lg bg-chat-accent px-3 py-2 text-xs font-semibold text-white hover:bg-chat-accentHover">
          Join
        </button>
      </div>
    </div>
  )
}
