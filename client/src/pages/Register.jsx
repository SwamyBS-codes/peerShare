import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'
import BrandMark from '../components/BrandMark'

export default function Register() {
  // Step 1 variables
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')

  // Step 2 variables
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(1) // 1 = Details, 2 = OTP Verification
  const [loading, setLoading] = useState(false)
  const [debugOtp, setDebugOtp] = useState('') // Helper for local dev if SMTP is unset
  const [cooldown, setCooldown] = useState(0) // resend cooldown timer

  const navigate = useNavigate()

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!email || !userId || !password) {
      toast.error('All fields are required.')
      return
    }

    setLoading(true)
    try {
      const data = await authService.requestRegisterOtp(email, userId, password)
      toast.success('Verification code dispatched!')

      // If server returned OTP (debug mode fallback)
      if (data.otp) {
        setDebugOtp(data.otp)
      }

      setStep(2)
      setCooldown(60) // 1-minute resend cooldown
    } catch (err) {
      toast.error(err.message || 'Signup request failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault()
    if (!otp) {
      toast.error('Please enter the verification code.')
      return
    }

    setLoading(true)
    try {
      await authService.verifyOtpAndRegister(email, userId, password, otp)
      toast.success('Account created successfully!')
      // Dispatch custom event to notify App.jsx state updates
      window.dispatchEvent(new Event('auth-change'))
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Verification failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (cooldown > 0) return
    setLoading(true)
    try {
      const data = await authService.requestRegisterOtp(email, userId, password)
      toast.success('New verification code sent!')
      if (data.otp) {
        setDebugOtp(data.otp)
      }
      setCooldown(60)
    } catch (err) {
      toast.error(err.message || 'Resend failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full max-w-md px-6 py-12 mx-auto my-auto">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-0 left-[-20%] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-[-20%] w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-[1.5px] rounded-[28px] bg-gradient-to-tr from-indigo-500/30 via-purple-500/25 to-pink-500/30 shadow-2xl">
        <div className="p-8 rounded-[27px] bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-xl flex flex-col items-center">

          {/* Logo / Branding */}
          <div className="flex items-center gap-2.5 mb-6">
            <BrandMark className="h-7 w-7 text-indigo-500" />
            <span className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">PeerShare</span>
          </div>

          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Create Account</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mb-8">
            {step === 1 ? 'Join the secure sharing hub' : 'Verify your email address'}
          </p>

          {step === 1 ? (
            // --- STEP 1: Details ---
            <form onSubmit={handleRequestOtp} className="w-full space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200/50 bg-white/40 dark:border-slate-800/40 dark:bg-slate-900/60 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-300 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Public User ID</label>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. john_doe"
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200/50 bg-white/40 dark:border-slate-800/40 dark:bg-slate-900/60 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-300 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200/50 bg-white/40 dark:border-slate-800/40 dark:bg-slate-900/60 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-300 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-650 to-pink-600 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition duration-300 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Request Code'}
              </button>
            </form>
          ) : (
            // --- STEP 2: OTP Verification ---
            <form onSubmit={handleVerifyAndRegister} className="w-full space-y-5">
              <div className="text-center mb-2">
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  A verification code has been dispatched to <strong className="text-slate-350">{email}</strong>. Please enter the 6-digit code below.
                </p>
              </div>

              {debugOtp && (
                <div className="p-3.5 rounded-2xl bg-indigo-550/10 border border-indigo-500/25 text-center text-xs font-bold text-indigo-400">
                  🔧 Dev Debug Mode Code: <strong className="text-base select-all">{debugOtp}</strong>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 text-center">Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="_ _ _ _ _ _"
                  className="w-full px-4 py-3.5 text-center text-2xl tracking-[0.4em] font-black rounded-2xl border border-slate-200/50 bg-white/40 dark:border-slate-800/40 dark:bg-slate-900/60 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-300 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-650 to-pink-600 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition duration-300 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Verify & Register'}
              </button>

              <div className="flex justify-between items-center text-xs font-semibold px-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-400 font-bold"
                >
                  ← Change Details
                </button>

                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className={`font-bold ${cooldown > 0 ? 'text-slate-500 cursor-not-allowed' : 'text-indigo-500 hover:text-indigo-400'}`}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-xs text-slate-400 dark:text-slate-500 font-semibold">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-500 hover:text-indigo-400 font-bold underline ml-1">
              Sign In
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
