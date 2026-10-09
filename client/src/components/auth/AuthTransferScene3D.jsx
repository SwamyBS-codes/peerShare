import { motion } from 'framer-motion'

const packets = [
  { delay: 0, color: 'from-violet-400 to-indigo-500', label: 'PDF' },
  { delay: 1.1, color: 'from-cyan-400 to-teal-500', label: 'MP4' },
  { delay: 2.2, color: 'from-fuchsia-400 to-pink-500', label: 'ZIP' },
  { delay: 3.3, color: 'from-emerald-400 to-chat-accentLight', label: 'RAW' },
]

function DeviceNode({ side, accent }) {
  const isLeft = side === 'left'
  return (
    <motion.div
      className="auth-device-node absolute top-1/2 w-[88px] sm:w-[104px]"
      style={{
        left: isLeft ? '8%' : 'auto',
        right: isLeft ? 'auto' : '8%',
        transform: `translateY(-50%) rotateY(${isLeft ? 28 : -28}deg)`,
      }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div
        className={`relative rounded-2xl border-2 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-sm ${accent.border}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className={`absolute -inset-1 rounded-2xl opacity-40 blur-md ${accent.glow}`} />
        <div className="relative space-y-2">
          <div className="flex items-center justify-between">
            <span className={`h-2 w-2 rounded-full ${accent.led} animate-pulse`} />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
              {isLeft ? 'Send' : 'Recv'}
            </span>
          </div>
          <div className="h-14 rounded-lg border border-white/10 bg-gradient-to-b from-slate-800/80 to-slate-900/90 p-1.5">
            {isLeft ? (
              <div className="flex h-full flex-col items-center justify-center gap-0.5 text-indigo-300">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19V5M12 5l-4 4M12 5l4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[7px] font-bold uppercase tracking-wider">Upload</span>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-0.5 text-cyan-300">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M12 19l-4-4M12 19l4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[7px] font-bold uppercase tracking-wider">Stream</span>
              </div>
            )}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${isLeft ? 'from-indigo-500 to-violet-500' : 'from-cyan-500 to-teal-400'}`}
              animate={{ width: ['20%', '95%', '35%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
      <p className={`mt-2 text-center text-[9px] font-black uppercase tracking-[0.2em] ${accent.label}`}>
        {isLeft ? 'Peer A' : 'Peer B'}
      </p>
    </motion.div>
  )
}

function TransferPacket({ delay, color, label }) {
  return (
    <div
      className="auth-transfer-packet absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2"
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className={`flex h-full w-full flex-col items-center justify-center rounded-lg border border-white/20 bg-gradient-to-br ${color} shadow-lg shadow-black/40`}
        style={{ transform: 'translateZ(48px)' }}
      >
        <svg className="h-3.5 w-3.5 text-white/90" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 1h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" opacity="0.35" />
          <path d="M9 1v3h3" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <span className="text-[6px] font-black text-white/90">{label}</span>
      </div>
    </div>
  )
}

function VideoFrameOrbit() {
  return (
    <motion.div
      className="auth-video-orbit absolute left-1/2 top-[18%] h-20 w-28 -translate-x-1/2"
      animate={{ rotateY: 360 }}
      transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div
        className="absolute inset-0 rounded-xl border border-cyan-400/40 bg-slate-900/80 shadow-lg shadow-cyan-500/20"
        style={{ transform: 'translateZ(36px)' }}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-xl">
          <div className="flex items-center gap-1 border-b border-white/10 bg-slate-950/80 px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            <span className="text-[7px] font-bold uppercase tracking-wider text-cyan-300/90">Live P2P</span>
          </div>
          <div className="relative flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-950/80 to-cyan-950/60">
            <motion.div
              className="h-8 w-8 rounded-full border-2 border-cyan-400/50"
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <svg className="absolute h-4 w-4 text-white/80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function AuthTransferScene3D({ compact = false }) {
  return (
    <div
      className={`auth-scene-root relative overflow-hidden ${compact ? 'h-[220px] w-full' : 'h-full min-h-[280px] w-full flex-1'}`}
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(ellipse_at_70%_80%,rgba(6,182,212,0.18),transparent_50%)]" />
      <div className="auth-scene-grid absolute inset-0 opacity-[0.35]" />

      <div className={`auth-scene-stage relative mx-auto h-full ${compact ? 'max-w-md' : 'max-w-xl'} px-4`}>
        <div className="auth-scene-world relative h-full w-full">
          <VideoFrameOrbit />

          <div className="auth-tunnel-ring absolute left-1/2 top-1/2 h-[140px] w-[min(92%,320px)] -translate-x-1/2 -translate-y-1/2">
            <div className="auth-tunnel-glow absolute inset-0 rounded-full" />
            {packets.map((p) => (
              <TransferPacket key={p.label + p.delay} {...p} />
            ))}
          </div>

          <DeviceNode
            side="left"
            accent={{
              border: 'border-indigo-400/60',
              glow: 'bg-indigo-500/30',
              led: 'bg-indigo-400',
              label: 'text-indigo-300',
            }}
          />
          <DeviceNode
            side="right"
            accent={{
              border: 'border-cyan-400/60',
              glow: 'bg-cyan-500/30',
              led: 'bg-cyan-400',
              label: 'text-cyan-300',
            }}
          />

          <motion.div
            className="absolute bottom-[12%] left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-1.5 backdrop-blur-md"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-transparent bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-cyan-300 bg-clip-text">
              WebRTC · Direct tunnel
            </p>
          </motion.div>
        </div>
      </div>

      {!compact && (
        <div className="absolute bottom-6 left-6 right-6 hidden flex-wrap gap-3 lg:flex">
          {[
            { t: 'Encrypted', c: 'text-indigo-300' },
            { t: 'Zero cloud storage', c: 'text-cyan-300' },
            { t: 'Files & video', c: 'text-fuchsia-300' },
          ].map(({ t, c }) => (
            <span key={t} className={`text-[10px] font-bold uppercase tracking-widest ${c}`}>
              ◆ {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
