import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/auth/AuthLayout'
import { IconLock } from '../components/icons/MessageIcons'
import { authService } from '../services/authService'

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
  const [resetDebugOtp, setResetDebugOtp] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect')

  const handleLogin = async (event) => {
    event.preventDefault()
    if (!email || !password) {
      toast.error('All fields are required.')
      return
    }

    if (!rememberMe) {
      sessionStorage.setItem('peershare_session_only', '1')
    } else {
      sessionStorage.removeItem('peershare_session_only')
    }

    setLoading(true)
    try {
      await authService.login(email, password)
      toast.success('Welcome back!')
      window.dispatchEvent(new Event('auth-change'))
      const safeRedirect =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/'
      navigate(safeRedirect)
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
      if (data.otp) setResetDebugOtp(data.otp)
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

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.')
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
      setResetDebugOtp('')
    } catch (error) {
      toast.error(error.message || 'Unable to reset password.')
    } finally {
      setResetLoading(false)
    }
  }

  const closeForgot = () => {
    setShowForgotPassword(false)
    setResetSent(false)
    setResetDebugOtp('')
  }

  return (
    <>
      <AuthLayout
        title="Sign in to your tunnel"
        subtitle="Access encrypted chats, direct file drops, and peer-to-peer video — nothing stored in the cloud."
        footer={
          <p className="text-center text-sm text-slate-400">
            New here?{' '}
            <Link to="/register" className="font-semibold text-chat-accentLight hover:underline">
              Create account
            </Link>
          </p>
        }
      >
        <h2 className="text-xl font-bold text-white">Welcome back</h2>
        <p className="mt-1 text-sm text-slate-400">Use your account email and password.</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="auth-field-label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="auth-field-control"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="auth-field-label">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                className="auth-field-control pr-14"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 text-xs font-semibold text-chat-accentLight"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-slate-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="rounded border-white/20 bg-[#2a3942] text-chat-accent focus:ring-chat-accent/30"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="font-medium text-chat-linkDark hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" disabled={loading} className="auth-primary-btn">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <IconLock className="h-3.5 w-3.5 text-chat-accentLight" /> End-to-end session token
        </p>
      </AuthLayout>

      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="auth-glass-card w-full max-w-md p-6"
              role="dialog"
              aria-labelledby="reset-title"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 id="reset-title" className="text-lg font-bold text-white">
                    Reset password
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">We&apos;ll email you a verification code.</p>
                </div>
                <button type="button" onClick={closeForgot} className="icon-btn !h-8 !w-8 text-slate-400">
                  ×
                </button>
              </div>

              {!resetSent ? (
                <div className="space-y-4">
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    placeholder="Email"
                    className="auth-field-control"
                    autoComplete="email"
                  />
                  <button type="button" onClick={handleForgotPasswordRequest} disabled={resetLoading} className="auth-primary-btn">
                    {resetLoading ? 'Sending…' : 'Send code'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resetDebugOtp && (
                    <div className="rounded-xl border border-chat-accent/30 bg-chat-accent/10 px-3 py-2 text-xs text-chat-accentLight">
                      Debug code: <strong>{resetDebugOtp}</strong>
                    </div>
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    value={resetOtp}
                    onChange={(event) => setResetOtp(event.target.value)}
                    placeholder="6-digit code"
                    className="auth-field-control tracking-widest"
                    autoComplete="one-time-code"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="New password (min. 8 characters)"
                    className="auth-field-control"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={handlePasswordReset} disabled={resetLoading} className="auth-primary-btn">
                    {resetLoading ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
