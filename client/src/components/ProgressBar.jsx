function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  let val = bytesPerSec
  let unitIdx = 0
  while (val >= 1024 && unitIdx < units.length - 1) {
    val /= 1024
    unitIdx += 1
  }
  return `${val.toFixed(2)} ${units[unitIdx]}`
}

function formatETA(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  if (seconds < 60) return `${Math.round(seconds)}s remaining`
  const minutes = Math.floor(seconds / 60)
  const remainingSecs = Math.round(seconds % 60)
  return `${minutes}m ${remainingSecs}s remaining`
}

export default function ProgressBar({ label, progress, speed, totalBytes, tone = 'sky' }) {
  const colorClass = tone === 'emerald' 
    ? 'from-emerald-450 via-teal-500 to-cyan-500 shadow-emerald-500/30' 
    : 'from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/30'

  let etaText = ''
  if (totalBytes && speed > 0 && progress < 100) {
    const remainingBytes = totalBytes * (1 - progress / 100)
    const etaSeconds = remainingBytes / speed
    etaText = formatETA(etaSeconds)
  }

  return (
    <div className="space-y-4 p-5 rounded-2xl bg-slate-100/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/10">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">
        <span>{label}</span>
        <span className="font-mono text-sm text-slate-800 dark:text-slate-100">{progress}%</span>
      </div>
      
      {/* Outer track */}
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900/60 p-[3px] shadow-inner relative">
        {/* Glowing inner bar with moving stripes */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass} shadow-md transition-all duration-300 relative overflow-hidden`}
          style={{ width: `${progress}%` }}
        >
          {/* Moving shimmer stripe effect */}
          <div className="absolute inset-0 shimmer-bg opacity-30 pointer-events-none" />
          {/* Subtle light glow bar at the edge */}
          <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/50 rounded-full blur-[1px]" />
        </div>
      </div>

      {(speed > 0 || etaText) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
          {speed > 0 ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Speed: {formatSpeed(speed)}</span>
            </div>
          ) : (
            <div />
          )}
          {etaText && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-200/60 text-slate-600 dark:bg-slate-800/60 dark:text-slate-350 text-[10px] font-extrabold uppercase tracking-wider">
              <span>{etaText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
