function Stat({ label, value, tone = 'text-slate-200' }) {
  return <div className="flex items-center justify-between py-2.5 text-xs"><span className="text-slate-500">{label}</span><span className={`font-bold ${tone}`}>{value}</span></div>
}

export function ActivityPanel({ friends, transferState, transferSpeed, activeCall }) {
  const online = friends.filter(friend => friend.isOnline)
  return <aside className="hidden w-[280px] shrink-0 flex-col gap-4 xl:flex">
    <section className="rounded-2xl border border-white/[.08] bg-[#101827]/80 p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-white">Live network</p><p className="mt-0.5 text-[10px] font-medium text-slate-500">Your P2P workspace</p></div><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">⌁</span></div>
      <div className="mt-3 divide-y divide-white/[.06]"><Stat label="Connection quality" value="Excellent" tone="text-emerald-400" /><Stat label="Connected peers" value={`${online.length} online`} /><Stat label="Transfer speed" value={transferState ? `${Math.round(transferSpeed / 1024)} KB/s` : 'Ready'} /><Stat label="Active call" value={activeCall ? 'In progress' : 'None'} tone={activeCall ? 'text-indigo-300' : 'text-slate-400'} /></div>
    </section>
    <section className="rounded-2xl border border-white/[.08] bg-[#101827]/80 p-4 shadow-xl shadow-black/10"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-white">Online now</p><p className="mt-0.5 text-[10px] text-slate-500">Available to connect</p></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-400">{online.length}</span></div><div className="mt-4 space-y-2">{online.slice(0, 5).map(friend => <div key={friend.friendId} className="flex items-center gap-2.5"><div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">{friend.friendUserId.slice(0, 2).toUpperCase()}<span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#101827] bg-emerald-400" /></div><span className="truncate text-xs font-medium text-slate-300">@{friend.friendUserId}</span></div>)}{online.length === 0 && <p className="rounded-xl bg-white/[.03] px-3 py-4 text-center text-xs text-slate-500">Peers will appear here when they are online.</p>}</div></section>
    <section className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-4"><p className="text-xs font-bold text-indigo-200">Privacy status</p><p className="mt-1 text-[11px] leading-5 text-slate-400">Messages and transfers are sent through encrypted peer connections.</p></section>
  </aside>
}
