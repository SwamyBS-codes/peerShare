export default function BrandMark({ className = 'h-9 w-9' }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-ps-brand shadow-lg shadow-indigo-500/30 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" className="h-[55%] w-[55%]" fill="none">
        <path
          d="M10 20c0-5.5 4.5-10 10-10 2.2 0 4.2.7 5.8 1.9M30 20c0 5.5-4.5 10-10 10-2.2 0-4.2-.7-5.8-1.9"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M14 20h12M20 14v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      </svg>
    </span>
  )
}
