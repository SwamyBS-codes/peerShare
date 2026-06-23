import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark'

export default function Home() {
  return (
    <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-6 relative">
      
      {/* Hero Content */}
      <div className="relative space-y-8 animate-fadeIn">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 dark:bg-indigo-400/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
          <BrandMark className="h-5 w-5" />
          <span>PeerShare v1.0</span>
        </div>
        
        <h1 className="text-5xl font-black leading-[1.1] text-slate-900 dark:text-white md:text-6xl tracking-tight">
          Instant P2P <br/>
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            File Sharing
          </span>
        </h1>
        
        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
          Transfer files directly between devices with WebRTC. No permanent cloud storage, no data size limits—just fast and secure browser-to-browser transfer.
        </p>
        
        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            to="/send"
            className="hover-lift flex items-center gap-2 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 px-7 py-4 font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/45 transition duration-300"
          >
            <span>Send File</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            to="/receive"
            className="hover-lift flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 px-7 py-4 font-bold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition duration-300 backdrop-blur-sm"
          >
            <span>Receive File</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </Link>
        </div>

        {/* Small stats section */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200/50 dark:border-slate-800/40">
          <div>
            <h4 className="text-2xl font-black text-indigo-500 dark:text-indigo-400">100%</h4>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Direct P2P</p>
          </div>
          <div>
            <h4 className="text-2xl font-black text-purple-500 dark:text-purple-400">0 MB</h4>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Server Files</p>
          </div>
          <div>
            <h4 className="text-2xl font-black text-pink-500 dark:text-pink-400">&lt; 1s</h4>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Handshake</p>
          </div>
        </div>
      </div>

      {/* Hero Visual Card Panel */}
      <div className="relative glass-panel rounded-[32px] p-8 shadow-2xl transition duration-500 hover:scale-[1.01]">
        
        {/* Decorative elements */}
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-tr from-purple-400/20 to-pink-400/20 blur-xl dark:from-purple-500/10 dark:to-pink-500/10 float-slow" />
        <div className="absolute -bottom-10 left-8 h-36 w-36 rounded-full bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 blur-2xl dark:from-indigo-500/10 dark:to-cyan-500/10 float-slower" />

        <h2 className="relative text-xl font-bold text-slate-800 dark:text-white mb-6">Why PeerShare?</h2>
        
        <ul className="relative space-y-4">
          <li className="hover-lift flex items-start gap-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 p-4 border border-slate-200/50 dark:border-slate-800/20 shadow-sm transition hover:bg-white dark:hover:bg-slate-900/60 duration-200">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/10 dark:text-indigo-400 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0114 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Direct Device-to-Device</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No intermediate file uploads. Data goes straight from your device to the peer.</p>
            </div>
          </li>

          <li className="hover-lift flex items-start gap-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 p-4 border border-slate-200/50 dark:border-slate-800/20 shadow-sm transition hover:bg-white dark:hover:bg-slate-900/60 duration-200">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 dark:bg-purple-400/10 dark:text-purple-400 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Quick Link & QR Onboarding</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scan QR code or click on share link to establish instant WebRTC signaling connection.</p>
            </div>
          </li>

          <li className="hover-lift flex items-start gap-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 p-4 border border-slate-200/50 dark:border-slate-800/20 shadow-sm transition hover:bg-white dark:hover:bg-slate-900/60 duration-200">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500 dark:bg-pink-400/10 dark:text-pink-400 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Realtime Speeds & Interrupted Resumes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Track download progress in real-time. If network fails, automatically resume without starting over.</p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  )
}
