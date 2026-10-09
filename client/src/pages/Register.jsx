import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/auth/AuthLayout'
import { authService } from '../services/authService'

const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent']
const strengthColors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-chat-accentLight']

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

const USER_ID_PATTERN = /^[a-zA-Z0-9_]{3,30}$/

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
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
  const usernameValid = USER_ID_PATTERN.test(form.username.trim())

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const validateStepOne = () => {
    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      toast.error('Please complete all fields.')
      return false
    }

    if (!USER_ID_PATTERN.test(form.username.trim())) {
      toast.error('User ID: 3–30 characters, letters, numbers, and underscores only.')
      return false
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.')
      return false
    }

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return false
    }

    return true
  }

  const requestCode = async (event) => {
    event?.preventDefault()
    if (!validateStepOne()) return

    setLoading(true)
    try {
      const data = await authService.requestRegisterOtp(form.email, form.username.trim(), form.password)
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

    if (!otp || otp.trim().length < 4) {
      toast.error('Enter the verification code from your email.')
      return
    }

    setLoading(true)
    try {
      await authService.verifyOtpAndRegister(form.email, form.username.trim(), form.password, otp.trim())
      window.dispatchEvent(new Event('auth-change'))
      toast.success('Account created!')
      navigate('/')
    } catch (error) {
      toast.error(error.message || 'Verification failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const layoutCopy =
    step === 1
      ? {
          title: 'Join the peer network',
          subtitle: 'Create your identity, then verify your email. Your files and calls stay direct between browsers.',
        }
      : {
          title: 'Almost connected',
          subtitle: 'Enter the code we sent — then your P2P chat hub unlocks instantly.',
        }

  return (
    <AuthLayout
      {...layoutCopy}
      step={step}
      totalSteps={2}
      footer={
        <p className="text-center text-sm text-slate-400">
          Have an account?{' '}
          <Link to="/login" className="font-semibold text-chat-accentLight hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form
            key="step1"
            onSubmit={requestCode}
            className="space-y-4"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
          >
            <h2 className="text-xl font-bold text-white">Your details</h2>
            <p className="text-sm text-slate-400">Pick a public user ID — friends will find you by this handle.</p>

            <div>
              <label htmlFor="username" className="auth-field-label">
                User ID
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleFieldChange}
                placeholder="e.g. alex_streams"
                autoComplete="username"
                className={`auth-field-control ${form.username && !usernameValid ? '!border-rose-500/70' : ''}`}
                required
              />
              {form.username && !usernameValid && (
                <p className="mt-1 text-xs text-rose-400">3–30 chars: letters, numbers, underscores.</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="auth-field-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleFieldChange}
                placeholder="you@example.com"
                autoComplete="email"
                className="auth-field-control"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="auth-field-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleFieldChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="auth-field-control pr-14"
                  required
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-3 text-xs font-semibold text-chat-accentLight">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="auth-field-label">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleFieldChange}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className={`auth-field-control pr-14 ${hasPasswordMismatch ? '!border-rose-500/70' : passwordsMatch ? '!border-chat-accentLight/70' : ''}`}
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute inset-y-0 right-3 text-xs font-semibold text-chat-accentLight">
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <div className="mb-2 flex justify-between text-xs text-slate-400">
                <span>Password strength</span>
                <span className="font-medium text-slate-300">{passwordStrength.label}</span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-colors ${index <= passwordStrength.score ? strengthColors[passwordStrength.score] : 'bg-white/10'}`}
                  />
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || !usernameValid} className="auth-primary-btn">
              {loading ? 'Sending code…' : 'Continue'}
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="step2"
            onSubmit={verify}
            className="space-y-4"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
          >
            <h2 className="text-xl font-bold text-white">Verify email</h2>
            <p className="text-sm text-slate-400">
              Code sent to <span className="font-medium text-slate-200">{form.email}</span>
            </p>

            {debugOtp && (
              <div className="rounded-xl border border-chat-accent/30 bg-chat-accent/10 px-3 py-2 text-xs text-chat-accentLight">
                Debug OTP: <strong>{debugOtp}</strong>
              </div>
            )}

            <div>
              <label htmlFor="otp" className="auth-field-label">
                Verification code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="6-digit code"
                className="auth-field-control text-center text-lg tracking-[0.35em]"
                autoComplete="one-time-code"
                required
              />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={requestCode} disabled={cooldown > 0 || loading} className="auth-secondary-btn">
                {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend code'}
              </button>
              <button type="submit" disabled={loading} className="auth-primary-btn !w-auto flex-[1.2]">
                {loading ? 'Verifying…' : 'Create account'}
              </button>
            </div>

            <button type="button" onClick={() => setStep(1)} className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-300">
              ← Edit account details
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  )
}
