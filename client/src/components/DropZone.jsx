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
    onFilesSelected(valid)
  }

  return (
    <div className="space-y-4">
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
        className={`w-full rounded-2xl border-2 border-dashed p-10 text-left transition ${
          dragging
            ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
            : 'border-slate-300 bg-white/70 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900/70'
        }`}
      >
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Drag and drop files here</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">or click to choose files from your device.</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
          Maximum file size: {Number.isFinite(maxFileSizeBytes) ? formatSize(maxFileSizeBytes) : 'No hard limit'}
        </p>
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

      <div className="space-y-2">
        {files.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No files selected yet.</p>
        ) : (
          files.map((file) => (
            <div
              key={`${file.name}-${file.lastModified}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/80"
            >
              <span className="max-w-[70%] truncate font-medium text-slate-700 dark:text-slate-200">{file.name}</span>
              <span className="text-slate-500 dark:text-slate-400">{formatSize(file.size)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
