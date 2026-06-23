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
  if (seconds < 60) return `ETA: ${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSecs = Math.round(seconds % 60)
  return `ETA: ${minutes}m ${remainingSecs}s`
}

export default function ProgressBar({ label, progress, speed, totalBytes, tone = 'sky' }) {
  const colorClass = tone === 'emerald' 
    ? 'from-emerald-400 via-teal-500 to-cyan-500 shadow-emerald-500/20' 
    : 'from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/20'

  let etaText = ''
  if (totalBytes && speed > 0 && progress < 100) {
    const remainingBytes = totalBytes * (1 - progress / 100)
    const etaSeconds = remainingBytes / speed
    etaText = formatETA(etaSeconds)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{progress}%</span>
      </div>
      
      {/* Outer track */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 p-[2px]">
        {/* Glowing inner bar */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass} shadow-md transition-all duration-300 relative`}
          style={{ width: `${progress}%` }}
        >
          {/* Subtle light glow bar at the edge */}
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full blur-[1px]" />
        </div>
      </div>

      {(speed > 0 || etaText) && (
        <div className="flex justify-between text-xs font-semibold text-slate-400 dark:text-slate-500">
          {speed > 0 ? (
            <span>Speed: {formatSpeed(speed)}</span>
          ) : (
            <span />
          )}
          {etaText && <span>{etaText}</span>}
        </div>
      )}
    </div>
  )
}
