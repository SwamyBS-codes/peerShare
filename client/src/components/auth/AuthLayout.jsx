import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import BrandMark from '../BrandMark'

const contactItems = [
  { label: 'Email', value: 'support@peershare.app' },
  { label: 'Live chat', value: 'WhatsApp-style direct support' },
  { label: 'Response', value: 'Usually within a few minutes' },
  { label: 'Security', value: 'Peer-to-peer and encrypted' },
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
    <section className="auth-page-shell relative min-h-[100dvh] overflow-hidden bg-ps-auth">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(192,132,252,0.16),transparent_34%),url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 stroke=%22%23ffffff%22 stroke-opacity=%220.05%22 stroke-width=%221%22%3E%3Cpath d=%22M0 30h60M30 0v60%22/%3E%3C/g%3E%3C/svg%3E')] opacity-80" />

      <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        <motion.aside
          className="relative flex flex-col justify-between gap-8 border-b border-white/10 px-6 py-8 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r lg:border-white/10 lg:px-10 lg:py-12"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="max-w-xl space-y-6">
            <Link to="/how-it-works" className="inline-flex items-center gap-3 transition hover:opacity-90">
              <BrandMark className="h-11 w-11 ring-2 ring-indigo-400/30" />
              <div>
                <p className="text-lg font-bold text-white">PeerShare</p>
                <p className="text-xs font-medium text-indigo-200/70">P2P files &amp; video</p>
              </div>
            </Link>

            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-200">
                Secure contact area
              </span>
              <h1 className="max-w-lg text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">{subtitle}</p>
            </div>

            {step != null && totalSteps != null && (
              <div className="max-w-lg">
                <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.24em] text-indigo-200/50">
                  <span>Progress</span>
                  <span>
                    Step {step} / {totalSteps}
                  </span>
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${i + 1 <= step ? 'auth-step-bar-active' : 'bg-white/10'}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {contactItems.map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/55">{label}</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/45 p-4 shadow-2xl shadow-indigo-950/35 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 rounded-full bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 p-[2px] shadow-lg shadow-emerald-500/20">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                    PS
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">PeerShare Support</p>
                  <p className="text-xs text-emerald-300/80">online now</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
                Chat
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="max-w-[84%] rounded-2xl rounded-bl-md bg-white/7 px-4 py-3 text-sm leading-relaxed text-slate-100">
                Need help signing in or creating your account? Use the form on the right and keep your connections direct.
              </div>
              <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500/80 via-violet-500/75 to-cyan-500/75 px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-indigo-500/20">
                Clean two-panel layout, same gradient feel, no extra clutter.
              </div>
            </div>
          </div>
        </motion.aside>

        <motion.div
          className="flex min-w-0 items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <div className="w-full max-w-xl">
            <div className="auth-glass-card w-full overflow-hidden">
              <div className="border-b border-white/10 bg-white/5 px-6 py-4 sm:px-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-200/60">Secure session</p>
                    <h2 className="mt-1 text-lg font-bold text-white">Connect in a few steps</h2>
                  </div>
                  {step != null && totalSteps != null && (
                    <div className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-semibold text-slate-200">
                      {step}/{totalSteps}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-8">{children}</div>
            </div>

            {footer && <div className="mt-6 w-full">{footer}</div>}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
