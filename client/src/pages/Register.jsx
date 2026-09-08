import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import BrandMark from '../components/BrandMark'
import { authService } from '../services/authService'

const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent']
const strengthColors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-400']

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'No password' }

  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  const normalized = Math.min(score, 4)
  return { score: normalized, label: strengthLabels[normalized] }
}

export default function Register() {
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [debugOtp, setDebugOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!cooldown) return

    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const passwordStrength = getPasswordStrength(form.password)
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword
  const hasPasswordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const requestCode = async (event) => {
    event?.preventDefault()

    if (!form.fullName || !form.username || !form.email || !form.password || !form.confirmPassword) {
      toast.error('Please complete all fields.')
      return
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)
    try {
      const data = await authService.requestRegisterOtp(form.email, form.username, form.password)
      if (data.otp) setDebugOtp(data.otp)
      setStep(2)
      setCooldown(60)
      toast.success('Verification code sent!')
    } catch (error) {
      toast.error(error.message || 'Signup request failed.')
    } finally {
      setLoading(false)
    }
  }

  const verify = async (event) => {
    event.preventDefault()

    if (!otp) {
      toast.error('Enter the verification code.')
      return
    }

    setLoading(true)
    try {
      await authService.verifyOtpAndRegister(form.email, form.username, form.password, otp)
      window.dispatchEvent(new Event('auth-change'))
      toast.success('Account created!')
      navigate('/')
    } catch (error) {
      toast.error(error.message || 'Verification failed. Try again.')
    } finally {
      setLoading(false)
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(79,70,229,0.24),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_70%_100%,rgba(34,197,94,0.14),transparent_30%)]" />
          <div className="relative z-10 flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <span className="font-display text-2xl font-bold text-white">PeerShare</span>
          </div>

          <div className="relative z-10">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">Built for trust</p>
            <h1 className="max-w-md font-display text-5xl font-bold leading-[1.04] tracking-[-0.06em] text-white">
              Start a secure connection.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Create your space, meet peers instantly, and share files with a protected direct channel.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-indigo-300">
                <span>Connection status</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-300">Live</span>
              </div>
              <div className="mt-3 text-sm text-slate-100">Direct Connection Active</div>
              <div className="mt-1 text-xs text-slate-400">Latency: 18ms</div>
              <div className="mt-1 text-xs text-emerald-300">Secure Channel Established</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.2em] text-indigo-300">Message preview</div>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(34,197,94,0.8)]" />
              </div>
              <div className="mt-3 text-sm text-slate-100">Hey, can you send the design?</div>
              <div className="mt-2 text-xs text-slate-400">Uploading file...</div>
            </div>
          </div>
        </motion.aside>

        <motion.main
          className="flex items-center justify-center bg-[#121A2B] p-6 sm:p-8 lg:p-10"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="w-full max-w-lg">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandMark className="h-9 w-9" />
              <div className="font-display text-xl font-bold text-white">PeerShare</div>
            </div>

            <div className="mb-7 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  {step === 1 ? 'Create account' : 'Verify email'}
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.05em] text-white">
                  {step === 1 ? 'Welcome aboard' : 'Check your inbox'}
                </h2>
              </div>
              <div className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200">
                Step {step} / 2
              </div>
            </div>

            {step === 1 ? (
              <form onSubmit={requestCode} className="space-y-4.5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-200">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={handleFieldChange}
                      placeholder="Alex Morgan"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-200">
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={form.username}
                      onChange={handleFieldChange}
                      placeholder="alex_peer"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleFieldChange}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={handleFieldChange}
                        placeholder="Create a secure password"
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

                  <div className="sm:col-span-2 pb-2">
                    <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-200">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={handleFieldChange}
                        placeholder="Re-enter your password"
                        className={`w-full rounded-2xl border bg-slate-900/70 px-4 py-3.5 pr-12 text-sm text-white placeholder:text-slate-500 outline-none transition focus:ring-4 ${
                          hasPasswordMismatch
                            ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20'
                            : passwordsMatch
                              ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20'
                              : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/15'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400 transition hover:text-slate-200"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {form.confirmPassword.length > 0 && (
                      <div className="mt-2 text-xs text-slate-300">
                        {hasPasswordMismatch ? (
                          <span className="text-rose-300">Passwords do not match.</span>
                        ) : passwordsMatch ? (
                          <span className="text-emerald-300">Passwords match.</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                    <span>Password strength</span>
                    <span className="font-medium text-indigo-200">{passwordStrength.label}</span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <div
                        key={index}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          index <= passwordStrength.score ? strengthColors[passwordStrength.score] : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </motion.button>
                </div>
              </form>
            ) : (
              <form onSubmit={verify} className="space-y-5">
                {debugOtp && (
                  <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
                    Debug OTP: <span className="font-bold">{debugOtp}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="otp" className="mb-2 block text-sm font-medium text-slate-200">
                    Verification code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={requestCode}
                    disabled={cooldown > 0 || loading}
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3.5 text-sm font-medium text-slate-200 transition hover:border-indigo-400/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </motion.button>
                </div>
              </form>
            )}

            <p className="mt-8 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-indigo-300 transition hover:text-indigo-200">
                Sign in
              </Link>
            </p>
          </div>
        </motion.main>
      </div>
    </section>
  )
}
