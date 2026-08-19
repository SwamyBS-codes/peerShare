import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'
import BrandMark from '../components/BrandMark'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('All fields are required.')
      return
    }

    setLoading(true)
    try {
      await authService.login(email, password)
      toast.success('Logged in successfully!')
      // Dispatch custom event to notify App.jsx navigation/state updates
      window.dispatchEvent(new Event('auth-change'))
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Invalid email or password.')
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

          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Welcome Back</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mb-8">Access your direct P2P portal</p>

          <form onSubmit={handleLogin} className="w-full space-y-5">
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
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-xs text-slate-400 dark:text-slate-500 font-semibold">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-500 hover:text-indigo-400 font-bold underline ml-1">
              Create one now
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
