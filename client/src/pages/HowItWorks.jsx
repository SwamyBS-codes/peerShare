export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Handshake & Signaling',
      desc: 'The sender generates a room ID and tokens. Both devices connect to our lightweight WebSocket signaling server to exchange connection metadata (SDP offers/answers and ICE candidates). No file content ever passes through this server.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
    },
    {
      num: '02',
      title: 'NAT Traversal (STUN/TURN)',
      desc: 'Most devices sit behind firewalls and NATs. We query public STUN servers to detect public-facing IP addresses. If direct connection fails (due to strict symmetric NATs), the connection falls back to a TURN relay server to route traffic.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
        </svg>
      ),
    },
    {
      num: '03',
      title: 'P2P Connection & Encryption',
      desc: 'Once optimal paths are resolved, a direct peer-to-peer connection is opened. All data is protected with DTLS (Datagram Transport Layer Security) and SRTP encryption, guaranteeing private transmission directly between browsers.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      num: '04',
      title: 'Flow-Controlled Chunking',
      desc: 'Files are read as binary array buffers and sliced into small chunks. We stream chunks over WebRTC RTCDataChannels, periodically pausing to wait for receiver acknowledgments. This prevents browser memory buffer overflow (backpressure).',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
  ]

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 md:px-6 space-y-12 animate-fadeIn">
      
      {/* Intro */}
      <div className="space-y-4 max-w-xl">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">How it Works</h1>
        <p className="text-slate-650 dark:text-slate-350 text-base leading-relaxed">
          PeerShare uses modern WebRTC specifications to coordinate a direct stream between browsers, ensuring performance and confidentiality.
        </p>
      </div>

      {/* Grid Timeline */}
      <div className="grid gap-6 md:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.num}
            className="hover-lift glass-panel rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/20 shadow-sm relative overflow-hidden transition-all duration-300"
          >
            {/* Visual Step Number Backdrop */}
            <div className="absolute right-6 top-4 text-7xl font-black text-slate-200/40 dark:text-slate-800/10 pointer-events-none select-none font-display">
              {step.num}
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/10 dark:text-indigo-400">
                {step.icon}
              </div>
              <h2 className="text-base font-bold text-slate-850 dark:text-white">{step.title}</h2>
            </div>
            
            <p className="mt-4 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Callout box for security */}
      <div className="glass-panel rounded-[32px] p-6 border border-indigo-500/20 dark:border-indigo-500/10 bg-indigo-500/5 shadow-md flex flex-col md:flex-row items-center gap-6">
        <div className="p-4 rounded-2xl bg-indigo-500 text-white shrink-0 shadow-lg shadow-indigo-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Security & Privacy First</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            Because files are directly negotiated between devices via secure DTLS channels, no third-party server ever reads, catalogs, or logs your data. PeerShare does not have databases storing your sensitive data.
          </p>
        </div>
      </div>
    </section>
  )
}
