const tones = {
  connecting: {
    dot: 'bg-amber-500 shadow-amber-500/50',
    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  },
  connected: {
    dot: 'bg-emerald-500 shadow-emerald-500/50',
    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    dot: 'bg-rose-500 shadow-rose-500/50',
    bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
  },
  idle: {
    dot: 'bg-slate-400 shadow-slate-400/50',
    bg: 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400',
  },
}

export default function ConnectionStatus({ state, message }) {
  const activeTone = tones[state] || tones.idle

  return (
    <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-300 ${activeTone.bg}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeTone.dot}`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${activeTone.dot}`} />
      </span>
      <span>{message}</span>
    </div>
  )
}
