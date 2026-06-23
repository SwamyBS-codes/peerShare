import { useRef, useState } from 'react'

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

export default function DropZone({ files, onFilesSelected, maxFileSizeBytes = Number.POSITIVE_INFINITY }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleSelection = (list) => {
    const incoming = [...list]
    const hasLimit = Number.isFinite(maxFileSizeBytes) && maxFileSizeBytes > 0
    const valid = hasLimit ? incoming.filter((file) => file.size <= maxFileSizeBytes) : incoming
    onFilesSelected([...files, ...valid]) // Append to support multi-select across separate picker openings
  }

  const removeFile = (indexToRemove) => {
    const updated = files.filter((_, idx) => idx !== indexToRemove)
    onFilesSelected(updated)
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (event.dataTransfer.files?.length) {
            handleSelection(event.dataTransfer.files)
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`w-full rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 relative group overflow-hidden ${
          dragging
            ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 scale-[0.99]'
            : 'border-slate-300 bg-slate-100/40 hover:border-indigo-400 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900/60'
        }`}
      >
        <div className="absolute inset-0 shimmer-bg opacity-40 pointer-events-none" />
        
        {/* Animated Upload SVG */}
        <div className="flex flex-col items-center justify-center relative z-10">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-md group-hover:scale-110 transition duration-300 text-indigo-500 dark:text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 animate-bounce">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>
          <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-200">
            Drag & drop files here
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            or <span className="text-indigo-500 dark:text-indigo-400 font-semibold group-hover:underline">browse files</span> from your device
          </p>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            {Number.isFinite(maxFileSizeBytes) ? `Maximum file size: ${formatSize(maxFileSizeBytes)}` : 'No file size limit'}
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            handleSelection(event.target.files)
          }
        }}
      />

      {/* Selected File Queue List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Selected Files ({files.length})
        </h3>
        
        {files.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4 text-center text-sm text-slate-400 dark:border-slate-900 dark:bg-slate-950/20 dark:text-slate-500">
            No files queued for sending.
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 p-3 text-sm shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-center gap-3 max-w-[80%]">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/15 dark:text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-400/10 transition-colors"
                  title="Remove file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
