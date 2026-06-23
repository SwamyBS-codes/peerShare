export default function About() {
  const techStack = [
    { name: 'React 19', role: 'Frontend library for rendering interactive states.' },
    { name: 'Vite', role: 'Next-gen bundler for instantaneous hot reloads and production assets.' },
    { name: 'Tailwind CSS', role: 'Utility-first framework for responsive layout and aesthetics.' },
    { name: 'WebRTC API', role: 'RTCDataChannels for binary chunk transfers and direct streams.' },
    { name: 'WebSockets (ws)', role: 'Node.js WebSocket signaling layer for SDP metadata exchange.' },
    { name: 'Express & Node.js', role: 'Lightweight backend handling API sessions and token checks.' },
  ]

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-16 md:px-6 space-y-12 animate-fadeIn">
      
      {/* Introduction */}
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">About PeerShare</h1>
        <p className="text-slate-650 dark:text-slate-350 text-base leading-relaxed">
          PeerShare is a modern, serverless-style file transfer utility designed to solve the friction of cloud storage limits, speed throttling, and data privacy concerns.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]">
        
        {/* Author details */}
        <div className="glass-panel rounded-3xl p-6 shadow-sm border border-slate-200/50 dark:border-slate-800/20 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent blur-lg pointer-events-none" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Project Highlights</h2>
          
          <div className="space-y-4 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
            <p>
              Developed as a demonstration of high-performance real-time communications in modern web browsers.
            </p>
            <p>
              Features robust error recovery, connection state managers, automatic ACK queue tracking, and cryptographic tokens signed via HMAC keypairs to authenticate signaling rooms.
            </p>
            <div className="pt-2">
              <a
                href="https://github.com/swamybs2005"
                target="_blank"
                rel="noreferrer"
                className="hover-lift inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-850 px-4 py-2 font-bold text-white shadow hover:bg-slate-800 transition"
              >
                <span>Follow on GitHub</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Tech Stack List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Built With</h2>
          
          <div className="grid gap-3 sm:grid-cols-2">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="hover-lift glass-card rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/10 shadow-sm"
              >
                <h3 className="font-bold text-slate-850 dark:text-white text-xs">{tech.name}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {tech.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
