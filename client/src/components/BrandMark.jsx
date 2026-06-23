export default function BrandMark({ className = 'h-9 w-9' }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25 transition duration-300 hover:rotate-6 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none">
        <path
          d="M8 20h10M22 20h10M14 14l-6 6 6 6M26 14l6 6-6 6"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_35%)]" />
    </span>
  )
}
