import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import BrandMark from '../components/BrandMark'
import { authService } from '../services/authService'

const floatingCards = [
  { label: 'Direct Connection Active', detail: 'Latency: 18ms', className: 'left-8 top-12 md:left-10 md:top-16' },
  { label: 'Secure Channel Established', detail: 'End-to-end protected', className: 'right-5 top-14 md:right-10 md:top-16' },
  { label: 'project.zip', detail: '✓ Shared Successfully', className: 'bottom-12 left-10 md:bottom-14 md:left-14' }
]

function NetworkVisual() {
  return (
    <div className="relative mt-10 h-[300px] w-full overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(11,18,32,0.82))]">
      <div className="absolute inset-0 grid-visualizer opacity-70" />
      <svg viewBox="0 0 420 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M90 84 L170 122 L260 80 L330 140" stroke="rgba(99,102,241,0.45)" strokeWidth="1.5" fill="none" />
        <path d="M90 200 L170 150 L260 220 L330 170" stroke="rgba(99,102,241,0.42)" strokeWidth="1.5" fill="none" />
        <path d="M170 122 L170 150" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" fill="none" />
        <path d="M260 80 L260 220" stroke="rgba(30,41,59,0.5)" strokeWidth="1.5" fill="none" />
      </svg>

      {[{ x: 90, y: 84 }, { x: 170, y: 122 }, { x: 260, y: 80 }, { x: 330, y: 140 }, { x: 90, y: 200 }, { x: 170, y: 150 }, { x: 260, y: 220 }, { x: 330, y: 170 }].map((node, index) => (
        <motion.div
          key={index}
          className="absolute h-3.5 w-3.5 rounded-full border border-white/20 bg-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.9)]"
          style={{ left: `${node.x}px`, top: `${node.y}px`, transform: 'translate(-50%, -50%)' }}
          animate={{ scale: [1, 1.7, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.8 + index * 0.25, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {floatingCards.map((card, index) => (
        <motion.div
          key={card.label}
          className={`absolute ${card.className} rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 shadow-2xl shadow-slate-950/30 backdrop-blur-sm`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300/80">{card.label}</div>
          <div className="mt-1 text-xs text-slate-200">{card.detail}</div>
        </motion.div>
      ))}

      <motion.div
        className="absolute bottom-6 left-1/2 w-[220px] -translate-x-1/2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 shadow-lg shadow-emerald-500/10 backdrop-blur-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">status</div>
            <div className="mt-1 text-sm font-medium text-white">Secure transfer active</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-lg text-emerald-300">✓</div>
        </div>
      </motion.div>
    </div>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetOtp, setResetOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (event) => {
    event.preventDefault()
    if (!email || !password) {
      toast.error('All fields are required.')
      return
    }

    setLoading(true)
    try {
      await authService.login(email, password)
      toast.success('Welcome back!')
      window.dispatchEvent(new Event('auth-change'))
      navigate('/')
    } catch (error) {
      toast.error(error.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasswordRequest = async () => {
    if (!resetEmail) {
      toast.error('Enter your email to receive a reset code.')
      return
    }

    setResetLoading(true)
    try {
      const data = await authService.requestPasswordReset(resetEmail)
      setResetSent(true)
      toast.success(data.message || 'Reset code sent.')
    } catch (error) {
      toast.error(error.message || 'Unable to send reset code.')
    } finally {
      setResetLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!resetEmail || !resetOtp || !newPassword) {
      toast.error('Email, reset code, and new password are required.')
      return
    }

    setResetLoading(true)
    try {
      const data = await authService.resetPassword(resetEmail, resetOtp, newPassword)
      toast.success(data.message || 'Password updated successfully.')
      setShowForgotPassword(false)
      setResetEmail('')
      setResetOtp('')
      setNewPassword('')
      setResetSent(false)
    } catch (error) {
      toast.error(error.message || 'Unable to reset password.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-[#0B1220] px-4 py-8 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0F172A]/90 shadow-[0_40px_80px_rgba(15,23,42,0.8)] backdrop-blur-sm lg:grid-cols-[1.08fr_0.92fr]">
        <motion.aside
          className="relative hidden overflow-hidden bg-[#0B1220] p-8 lg:flex lg:flex-col lg:justify-between"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(79,70,229,0.28),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(34,197,94,0.12),transparent_35%)]" />
          <div className="relative z-10 flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <span className="font-display text-2xl font-bold text-white">PeerShare</span>
          </div>

          <div className="relative z-10">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">Secure communication</p>
            <h1 className="max-w-md font-display text-5xl font-bold leading-[1.04] tracking-[-0.06em] text-white">
              Connect. Communicate. Share.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              A secure peer-to-peer platform designed for seamless communication and lightning-fast file sharing.
            </p>
          </div>

          <div className="relative z-10">
            <NetworkVisual />
          </div>
        </motion.aside>

        <motion.main
          className="flex items-center justify-center bg-[#121A2B] p-6 sm:p-8 lg:p-10"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandMark className="h-9 w-9" />
              <div>
                <div className="font-display text-xl font-bold text-white">PeerShare</div>
              </div>
            </div>

            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">Welcome back</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.05em] text-white">Sign in to continue</h2>
              <p className="mt-2 text-sm text-slate-400">Secure access to your direct conversations and file transfers.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-slate-200">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                  required
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 pr-12 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400 transition hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="inline-flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-indigo-500/30"
                  />
                  Remember me
                </label>
                <button type="button" onClick={() => setShowForgotPassword(true)} className="font-medium text-indigo-300 transition hover:text-indigo-200">
                  Forgot password?
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </motion.button>
            </form>

            <p className="mt-10 text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-indigo-300 transition hover:text-indigo-200">
                Create account
              </Link>
            </p>
          </div>
        </motion.main>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#121A2B] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.8)]"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Password reset</p>
                <h3 className="mt-2 font-display text-2xl font-bold text-white">Forgot your password?</h3>
              </div>
              <button type="button" onClick={() => setShowForgotPassword(false)} className="rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1 text-sm text-slate-200">×</button>
            </div>

            {!resetSent ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-slate-200">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                  />
                </div>

                <button type="button" onClick={handleForgotPasswordRequest} disabled={resetLoading} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
                  {resetLoading ? 'Sending code...' : 'Send reset code'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="reset-otp" className="mb-2 block text-sm font-medium text-slate-200">Reset code</label>
                  <input
                    id="reset-otp"
                    type="text"
                    value={resetOtp}
                    onChange={(event) => setResetOtp(event.target.value)}
                    placeholder="Enter the 6-digit code"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-200">New password</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Enter your new password"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                  />
                </div>

                <button type="button" onClick={handlePasswordReset} disabled={resetLoading} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
                  {resetLoading ? 'Updating...' : 'Update password'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </section>
  )
}

