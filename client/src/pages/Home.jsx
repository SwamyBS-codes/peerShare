import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark'

function P2PVisualizer() {
  return (
    <div className="relative w-full aspect-[4/3] rounded-[24px] bg-slate-950/60 border border-slate-850/50 overflow-hidden flex flex-col items-center justify-center p-4 shadow-inner">
      {/* Tech Grid Background Pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-36 h-36 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-36 h-36 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none animate-pulse" />

      {/* SVG Canvas for P2P connection */}
      <svg className="w-full h-full max-w-[360px] max-h-[240px] relative z-10" viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        
        {/* Glowing blur under-line to fix the visibility issue */}
        <path d="M70 110 H270" stroke="url(#lineGradient)" strokeWidth="10" strokeLinecap="round" opacity="0.3" filter="url(#glowFilter)" />
        {/* Foreground dashed connection line */}
        <path d="M70 110 H270" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" />
        
        {/* File Signal 1: Document moving from Sender to Receiver */}
        <g>
          <path d="M-6 -8 h8 l4 4 v10 a1 1 0 0 1-1 1 h-11 a1 1 0 0 1-1-1 v-13 a1 1 0 0 1 1-1 z" fill="url(#fileGradient1)" filter="url(#iconGlow)" />
          <path d="M2 -8 v4 h4" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          <animateMotion dur="3.2s" repeatCount="indefinite" path="M70 110 H270" />
        </g>

        {/* File Signal 2: A cyan format file following behind */}
        <g>
          <path d="M-6 -8 h8 l4 4 v10 a1 1 0 0 1-1 1 h-11 a1 1 0 0 1-1-1 v-13 a1 1 0 0 1 1-1 z" fill="url(#fileGradient2)" filter="url(#iconGlow)" />
          <path d="M2 -8 v4 h4" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          <animateMotion dur="3.2s" begin="1.6s" repeatCount="indefinite" path="M70 110 H270" />
        </g>

        {/* Sender Device Node */}
        <g transform="translate(35, 70)" className="hover:scale-105 transition-transform duration-300 cursor-pointer">
          {/* Outer Glow */}
          <rect x="0" y="0" width="70" height="80" rx="16" fill="#1e1b4b" opacity="0.3" filter="url(#glowFilter)" />
          {/* Device Card */}
          <rect x="0" y="0" width="70" height="80" rx="16" fill="#0f172a" stroke="#6366f1" strokeWidth="2" />
          {/* Tech Detail Lines */}
          <path d="M8 22 H62 M8 58 H62" stroke="#1e293b" strokeWidth="1" />
          {/* Upload Icon */}
          <g transform="translate(23, 27)">
            <path d="M6 11 V3 M6 3 L2 7 M6 3 L10 7" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0 13 H12" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />
          </g>
          {/* Port indicator */}
          <rect x="67" y="35" width="4" height="10" rx="1.5" fill="#6366f1" />
          {/* Blinking Status LED */}
          <circle cx="12" cy="12" r="3.5" fill="#22c55e" className="animate-ping" opacity="0.75" />
          <circle cx="12" cy="12" r="3.5" fill="#22c55e" />
        </g>
        <text x="70" y="172" fill="#818cf8" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="0.12em">SENDER</text>

        {/* Receiver Device Node */}
        <g transform="translate(235, 70)" className="hover:scale-105 transition-transform duration-300 cursor-pointer">
          {/* Outer Glow */}
          <rect x="0" y="0" width="70" height="80" rx="16" fill="#083344" opacity="0.3" filter="url(#glowFilter)" />
          {/* Device Card */}
          <rect x="0" y="0" width="70" height="80" rx="16" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
          {/* Tech Detail Lines */}
          <path d="M8 22 H62 M8 58 H62" stroke="#1e293b" strokeWidth="1" />
          {/* Download Icon */}
          <g transform="translate(23, 27)">
            <path d="M6 3 V11 M6 11 L2 7 M6 11 L10 7" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0 13 H12" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" />
          </g>
          {/* Port indicator */}
          <rect x="-3" y="35" width="4" height="10" rx="1.5" fill="#06b6d4" />
          {/* Blinking Status LED */}
          <circle cx="12" cy="12" r="3.5" fill="#22c55e" className="animate-ping" opacity="0.75" />
          <circle cx="12" cy="12" r="3.5" fill="#22c55e" />
        </g>
        <text x="270" y="172" fill="#22d3ee" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="0.12em">RECEIVER</text>

        {/* Floating Data Badge */}
        <g transform="translate(125, 40)" className="animate-bounce">
          <rect width="90" height="28" rx="8" fill="#0f172a" stroke="url(#badgeBorderGradient)" strokeWidth="1.5" />
          <text x="45" y="17" fill="#a855f7" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="0.08em">DIRECT P2P</text>
        </g>

        {/* Definitions for Filters and Gradients */}
        <defs>
          <linearGradient id="lineGradient" x1="70" y1="110" x2="270" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="badgeBorderGradient" x1="0" y1="0" x2="90" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="fileGradient1" x1="-6" y1="-8" x2="6" y2="7" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="fileGradient2" x1="-6" y1="-8" x2="6" y2="7" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="iconGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      
      <div className="mt-4 flex gap-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest relative z-10">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span> DTLS Encrypted</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span> Zero Logs</span>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-16 px-6 py-8 md:grid-cols-2 lg:px-8 relative z-10">
      
      {/* Background radial soft light blobs */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

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
            className="hover-lift flex items-center gap-2 rounded-2xl border border-slate-250 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60 px-8 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition duration-300 backdrop-blur-sm shadow-sm"
          >
            <span>Receive Files</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </Link>
        </div>

        {/* Glassmorphic Stats mini-cards */}
        <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200/40 dark:border-slate-800/30">
          <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/30 backdrop-blur-sm shadow-sm hover:border-indigo-500/50 dark:hover:border-indigo-500/40 transition duration-300">
            <h4 className="text-2xl font-black text-indigo-500 dark:text-indigo-400">100%</h4>
            <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Direct Tunnel</p>
          </div>
          <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/30 backdrop-blur-sm shadow-sm hover:border-purple-500/50 dark:hover:border-purple-500/40 transition duration-300">
            <h4 className="text-2xl font-black text-purple-500 dark:text-purple-400">0 MB</h4>
            <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Stored Files</p>
          </div>
          <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/30 backdrop-blur-sm shadow-sm hover:border-pink-500/50 dark:hover:border-pink-500/40 transition duration-300">
            <h4 className="text-2xl font-black text-pink-500 dark:text-pink-400">&lt; 1s</h4>
            <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Transfer Speed</p>
          </div>
        </div>
      </div>

      {/* Hero Visual Card Panel with Premium 1px Gradient Border */}
      <div className="relative rounded-[36px] p-[1.5px] bg-gradient-to-tr from-indigo-500/30 via-purple-500/20 to-pink-500/30 shadow-2xl transition duration-500 hover:scale-[1.01] hover:shadow-indigo-500/10">
        <div className="rounded-[34px] bg-slate-900/80 dark:bg-slate-950/80 p-6 flex flex-col gap-6 backdrop-blur-md">
          <P2PVisualizer />
          
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Advanced P2P Architectures</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/10">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Multi-Channel WebRTC</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">Uses 4 concurrent data channels with adaptive flow control and packet loss NACK retries.</p>
              </div>
              <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/10">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Direct-to-Disk API</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">Saves data chunks directly to disk using standard browser streams, avoiding RAM exhaustion.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
