function Stat({ label, value, tone = 'text-slate-700 dark:text-slate-200' }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-xs">
      <span className="text-chat-muted dark:text-slate-500">{label}</span>
      <span className={`font-bold ${tone}`}>{value}</span>
    </div>
  )
}

export function ActivityPanel({ friends, transferState, transferSpeed, activeCall, darkMode = true }) {
  const online = friends.filter((friend) => friend.isOnline)
  const cardClass =
    'rounded-2xl border border-chat-border/80 bg-white/80 p-4 shadow-lg shadow-indigo-500/5 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#181c26]/90 dark:shadow-black/20'

  return (
    <aside className="hidden w-[min(100%,300px)] shrink-0 flex-col gap-4 overflow-y-auto border-l border-chat-border/60 bg-chat-header/50 p-4 dark:border-chat-borderDark/80 dark:bg-chat-headerDark/40 xl:flex">
      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Live network</p>
            <p className="mt-0.5 text-[10px] font-medium text-chat-muted dark:text-slate-500">Your P2P workspace</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300">
            ⌁
          </span>
        </div>
        <div className="mt-3 divide-y divide-chat-border/80 dark:divide-white/[0.06]">
          <Stat label="Connection quality" value="Excellent" tone="text-indigo-600 dark:text-indigo-300" />
          <Stat label="Connected peers" value={`${online.length} online`} />
          <Stat
            label="Transfer speed"
            value={transferState ? `${Math.round(transferSpeed / 1024)} KB/s` : 'Ready'}
          />
          <Stat
            label="Active call"
            value={activeCall ? 'In progress' : 'None'}
            tone={activeCall ? 'text-indigo-600 dark:text-indigo-300' : 'text-chat-muted dark:text-slate-400'}
          />
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Online now</p>
            <p className="mt-0.5 text-[10px] text-chat-muted dark:text-slate-500">Available to connect</p>
          </div>
          <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
            {online.length}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {online.slice(0, 8).map((friend) => (
            <div key={friend.friendId} className="flex items-center gap-2.5">
              <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
                {friend.friendUserId.slice(0, 2).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#181c26] bg-indigo-400" />
              </div>
              <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">@{friend.friendUserId}</span>
            </div>
          ))}
          {online.length === 0 && (
            <p className="rounded-xl bg-indigo-500/[0.06] px-3 py-4 text-center text-xs text-chat-muted dark:bg-white/[0.03] dark:text-slate-500">
              Peers will appear here when they are online.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-fuchsia-500/5 p-4">
        <p className="text-xs font-bold text-indigo-800 dark:text-indigo-200">Privacy status</p>
        <p className="mt-1 text-[11px] leading-5 text-chat-muted dark:text-slate-400">
          Messages and transfers are sent through encrypted peer connections.
        </p>
        {!darkMode && (
          <p className="mt-2 text-[10px] text-indigo-600/80">Light theme — switch anytime from the chat header.</p>
        )}
      </section>
    </aside>
  )
}
