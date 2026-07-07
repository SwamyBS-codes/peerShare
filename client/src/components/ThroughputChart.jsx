import { useMemo } from 'react'

function formatSpeed(bytesPerSec) {
  if (bytesPerSec === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k))
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function ThroughputChart({ data = [], status = '' }) {
  const width = 500
  const height = 120
  const padding = 8

  // Calculate points
  const { pathData, fillData, maxFormatted } = useMemo(() => {
    if (!data || data.length === 0) {
      return { pathData: '', fillData: '', maxFormatted: '0 B/s' }
    }

    const maxVal = Math.max(...data, 1024 * 1024) // Min max scale at 1 MB/s
    const points = data.map((val, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2)
      const y = height - padding - (val / maxVal) * (height - padding * 2)
      return { x, y }
    })

    if (points.length === 0) {
      return { pathData: '', fillData: '', maxFormatted: '0 B/s' }
    }

    // Build the SVG path string
    let p = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      p += ` L ${points[i].x} ${points[i].y}`
    }

    // Build the fill path string
    const f = `${p} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`

    return {
      pathData: p,
      fillData: f,
      maxFormatted: formatSpeed(maxVal)
    }
  }, [data])

  const currentSpeed = data.length > 0 ? data[data.length - 1] : 0

  return (
    <div className="w-full bg-slate-900/40 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200/10 dark:border-slate-800/20 backdrop-blur-sm space-y-2">
      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span>Throughput (Last 10s)</span>
        <span className="text-indigo-400 font-mono">Max: {maxFormatted}</span>
      </div>
      <div className="relative h-[120px] w-full">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-bold text-slate-500/60 p-4 text-center">
            <span>{status || 'Waiting for transmission...'}</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chart-fill-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1={padding} y1={height / 4} x2={width - padding} y2={height / 4} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
            <line x1={padding} y1={(height * 3) / 4} x2={width - padding} y2={(height * 3) / 4} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />

            {/* Area Fill */}
            {fillData && (
              <path
                d={fillData}
                fill="url(#chart-fill-grad)"
                className="transition-all duration-300 ease-out"
              />
            )}

            {/* Stroke Line */}
            {pathData && (
              <path
                d={pathData}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300 ease-out drop-shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
              />
            )}

            {/* Current point highlight */}
            {data.length > 0 && (
              <circle
                cx={padding + (width - padding * 2)}
                cy={height - padding - (currentSpeed / Math.max(...data, 1024 * 1024)) * (height - padding * 2)}
                r={4}
                fill="#818cf8"
                className="transition-all duration-300 ease-out animate-pulse"
              />
            )}
          </svg>
        )}
      </div>

      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
        <span className="text-[10px] font-extrabold uppercase text-slate-500">Current Speed</span>
        <span className="font-mono text-indigo-400">{formatSpeed(currentSpeed)}/s</span>
      </div>
    </div>
  )
}
