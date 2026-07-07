import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark'

function P2PVisualizer() {
  return (
    <div className="relative w-full aspect-[4/3] rounded-[32px] bg-slate-900/60 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/30 overflow-hidden flex flex-col items-center justify-center p-6 grid-visualizer shadow-inner">
      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-36 h-36 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-36 h-36 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none animate-pulse" />

      {/* SVG Canvas for P2P connection */}
      <svg className="w-full h-full max-w-[360px] max-h-[240px] relative z-10" viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Animated Connection Tunnel line */}
        <path d="M70 110 H270" stroke="url(#lineGradient)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="8 6" className="neon-glow-indigo" />
        
        {/* Signal pulses moving left to right */}
        <circle r="7" fill="#06b6d4" className="neon-glow-cyan">
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M70 110 H270" />
        </circle>
        <circle r="9" fill="#d946ef" opacity="0.6" className="neon-glow-pink">
          <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M70 110 H270" />
        </circle>

        {/* Sender Device Node */}
        <g transform="translate(35, 70)" className="hover:scale-105 transition-transform duration-300">
          <rect width="70" height="80" rx="14" fill="#1e293b" stroke="#6366f1" strokeWidth="2.5" className="shadow-lg" />
          <rect width="70" height="80" rx="14" fill="url(#senderGlow)" className="opacity-60" />
          <circle cx="35" cy="30" r="14" fill="#334155" />
          <circle cx="35" cy="30" r="6" fill="#6366f1" className="neon-glow-indigo" />
          {/* Subtle details on the device node */}
          <rect x="15" y="56" width="40" height="4" rx="2" fill="#475569" />
          <rect x="25" y="66" width="20" height="4" rx="2" fill="#475569" />
        </g>
        <text x="70" y="172" fill="#6366f1" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="0.1em">SENDER</text>

        {/* Receiver Device Node */}
        <g transform="translate(235, 70)" className="hover:scale-105 transition-transform duration-300">
          <rect width="70" height="80" rx="14" fill="#1e293b" stroke="#06b6d4" strokeWidth="2.5" className="shadow-lg" />
          <rect width="70" height="80" rx="14" fill="url(#receiverGlow)" className="opacity-60" />
          <circle cx="35" cy="30" r="14" fill="#334155" />
          <circle cx="35" cy="30" r="6" fill="#06b6d4" className="neon-glow-cyan" />
          {/* Subtle details on the device node */}
          <rect x="15" y="56" width="40" height="4" rx="2" fill="#475569" />
          <rect x="25" y="66" width="20" height="4" rx="2" fill="#475569" />
        </g>
        <text x="270" y="172" fill="#06b6d4" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="0.1em">RECEIVER</text>

        {/* Floating Data Badge */}
        <g transform="translate(125, 40)" className="animate-bounce">
          <rect width="90" height="30" rx="10" fill="#1e1b4b/90" stroke="#a855f7" strokeWidth="1.5" className="backdrop-blur-sm" />
          <text x="45" y="18" fill="#c084fc" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="0.05em">DIRECT P2P</text>
        </g>

        {/* Gradients */}
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <radialGradient id="senderGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="receiverGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      
      <div className="mt-4 flex gap-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest relative z-10">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span> DTLS Encrypted</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping"></span> Zero Storage Logs</span>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-16 px-6 py-8 md:grid-cols-2 lg:px-8 relative z-10">
      
      {/* Background radial soft light blobs */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Content */}
      <div className="relative space-y-8 animate-fadeIn relative z-10">
        <div className="inline-flex items-center gap-2.5 rounded-full bg-indigo-500/10 dark:bg-indigo-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          <BrandMark className="h-4.5 w-4.5" />
          <span>PeerShare v1.2</span>
        </div>
        
        <h1 className="text-5xl font-black leading-[1.05] text-slate-900 dark:text-white md:text-6xl tracking-tight">
          Instant Direct <br/>
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            P2P File Transfer
          </span>
        </h1>
        
        <p className="max-w-xl text-base text-slate-600 dark:text-slate-350 font-semibold leading-relaxed">
          Transfer multi-gigabyte files directly between device browsers using raw WebRTC channels. Secure, direct-to-disk streaming, and zero permanent cloud storage logs.
        </p>
        
        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            to="/send"
            className="hover-lift flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-650 to-pink-600 px-8 py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition duration-300"
          >
            <span>Send Files</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            to="/receive"
            className="hover-lift flex items-center gap-2 rounded-2xl border border-slate-205 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60 px-8 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition duration-300 backdrop-blur-sm shadow-sm"
          >
            <span>Receive Files</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </Link>
        </div>

        {/* Dynamic telemetry details */}
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200/40 dark:border-slate-800/30">
          <div>
            <h4 className="text-2xl font-black text-indigo-500 dark:text-indigo-400">100%</h4>
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Direct Tunnel</p>
          </div>
          <div>
            <h4 className="text-2xl font-black text-purple-500 dark:text-purple-400">0 MB</h4>
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Stored Files</p>
          </div>
          <div>
            <h4 className="text-2xl font-black text-pink-500 dark:text-pink-400">&lt; 1s</h4>
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Connection Speed</p>
          </div>
        </div>
      </div>

      {/* Hero Visual Card Panel */}
      <div className="relative glass-panel rounded-[36px] p-6 shadow-2xl transition duration-500 hover:scale-[1.01] flex flex-col gap-6 border border-white/20 dark:border-slate-800/30 relative z-10">
        <P2PVisualizer />
        
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-850 dark:text-white tracking-tight">Advanced P2P Architectures</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/10">
              <h3 className="font-extrabold text-slate-850 dark:text-white text-xs uppercase tracking-wider">Multi-Channel WebRTC</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">Uses 4 concurrent data channels with adaptive flow control and packet loss NACK retries.</p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/10">
              <h3 className="font-extrabold text-slate-850 dark:text-white text-xs uppercase tracking-wider">Direct-to-Disk API</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">Saves data chunks directly to disk using standard browser streams, avoiding RAM exhaustion.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
