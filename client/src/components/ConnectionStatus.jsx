const tones = {
  connecting: 'bg-amber-500',
  connected: 'bg-emerald-500',
  failed: 'bg-rose-500',
  idle: 'bg-slate-400',
}

export default function ConnectionStatus({ state, message }) {
  const dot = tones[state] || tones.idle

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-700">
      <span className={`h-2.5 w-2.5 rounded-full ${dot} animate-pulse`} />
      <span className="font-medium text-slate-700 dark:text-slate-200">{message}</span>
    </div>
  )
}
