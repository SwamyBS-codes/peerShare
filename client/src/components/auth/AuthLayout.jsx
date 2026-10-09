import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import BrandMark from '../BrandMark'
import AuthTransferScene3D from './AuthTransferScene3D'

const sideHighlights = [
  { title: 'Browser-native P2P', text: 'WebRTC data channels for chat, files, and calls—no upload queue.' },
  { title: 'You hold the keys', text: 'Sessions are token-based; payloads move peer-to-peer after signaling.' },
  { title: 'Built for groups', text: 'Direct messages, group rooms, and multi-party calls in one hub.' },
]

const sideStats = [
  { label: 'Transport', value: 'WebRTC + WS' },
  { label: 'Storage', value: 'None (P2P)' },
  { label: 'Media', value: 'DTLS-SRTP' },
]

export default function AuthLayout({
  title,
  subtitle,
  step,
  totalSteps,
  children,
  footer,
}) {
  return (
    <section className="auth-page-shell relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-ps-auth lg:flex-row lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 stroke=%22%23818cf8%22 stroke-opacity=%220.06%22 stroke-width=%221%22%3E%3Cpath d=%22M0 30h60M30 0v60%22/%3E%3C/g%3E%3C/svg%3E')] opacity-40" />

      <aside className="auth-side-rail auth-side-rail-left hidden min-h-0 flex-col justify-center gap-5 border-r border-indigo-400/10 px-8 py-12 2xl:flex">
        {sideHighlights.map(({ title: t, text }) => (
          <div key={t} className="auth-side-card max-w-[240px] rounded-2xl border border-indigo-400/15 bg-indigo-500/[0.06] p-4 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">{t}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{text}</p>
          </div>
        ))}
      </aside>

      <div className="relative flex min-h-[240px] min-w-0 flex-1 flex-col justify-between border-b border-indigo-400/10 lg:min-h-0 lg:max-w-none lg:border-b-0 lg:border-r lg:border-indigo-400/10 xl:flex-[1.15]">
        <div className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/how-it-works" className="flex items-center gap-3 transition hover:opacity-90">
            <BrandMark className="h-11 w-11 ring-2 ring-indigo-400/30" />
            <div>
              <p className="text-lg font-bold text-white">PeerShare</p>
              <p className="text-xs font-medium text-indigo-200/70">P2P files &amp; video</p>
            </div>
          </Link>
          {step != null && totalSteps != null && (
            <div className="hidden text-right sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300/50">Progress</p>
              <p className="text-sm font-semibold text-white">
                Step {step} / {totalSteps}
              </p>
            </div>
          )}
        </div>

        <div className="relative flex flex-1 flex-col justify-center px-4 pb-6 lg:px-8 lg:pb-10">
          <motion.div
            className="mb-4 space-y-2 px-1 lg:mb-8 lg:max-w-lg"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">{title}</h1>
            <p className="text-sm font-medium leading-relaxed text-slate-400 sm:text-base">{subtitle}</p>
            {step != null && totalSteps != null && (
              <div className="mt-4 flex gap-2">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`auth-step-bar h-1 flex-1 rounded-full ${i + 1 <= step ? 'auth-step-bar-active' : 'bg-white/10'}`}
                  />
                ))}
              </div>
            )}
          </motion.div>

          <div className="hidden min-h-[280px] flex-1 lg:flex">
            <AuthTransferScene3D />
          </div>
          <div className="lg:hidden">
            <div className="overflow-hidden rounded-2xl border border-indigo-400/20 bg-indigo-950/40">
              <AuthTransferScene3D compact />
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="relative z-10 flex min-w-0 flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:py-12 xl:max-w-xl xl:flex-none xl:px-10 2xl:max-w-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <div className="auth-glass-card w-full p-6 sm:p-8">{children}</div>
        {footer && <div className="mt-6 w-full">{footer}</div>}
      </motion.div>

      <aside className="auth-side-rail auth-side-rail-right hidden min-h-0 w-[min(100%,280px)] shrink-0 flex-col justify-center gap-4 border-l border-violet-400/10 px-8 py-12 2xl:flex">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300/80">At a glance</p>
        {sideStats.map(({ label, value }) => (
          <div key={label} className="auth-side-card rounded-xl border border-violet-400/15 bg-violet-500/[0.06] px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-bold text-white">{value}</p>
          </div>
        ))}
        <p className="mt-2 max-w-[220px] text-[11px] leading-relaxed text-slate-500">
          Sign in to open your messenger shell—contacts on the left, live peer stats on wide screens.
        </p>
      </aside>
    </section>
  )
}
