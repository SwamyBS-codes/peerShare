export default function ProgressBar({ label, progress, speed, tone = 'sky' }) {
  const colorClass = tone === 'emerald' ? 'from-emerald-500 to-teal-500' : 'from-sky-500 to-indigo-500'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-slate-600 dark:text-slate-300">{progress}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-200`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {speed > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Speed: {(speed / 1024 / 1024).toFixed(2)} MB/s</p>
      )}
    </div>
  )
}
