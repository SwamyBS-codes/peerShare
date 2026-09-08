import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import BrandMark from './BrandMark'

const links = [{ to: '/', label: 'Messages' }, { to: '/how-it-works', label: 'How it works' }, { to: '/about', label: 'About' }]
const navClass = ({ isActive }) => `rounded-lg px-3 py-2 text-xs font-bold transition ${isActive ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'}`

function ThemeButton({ darkMode, onToggle }) {
  return <button type="button" onClick={onToggle} aria-label="Toggle colour theme" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">{darkMode ? '☀' : '☾'}</button>
}

const settingsSections = [
  { id: 'profile', label: 'Profile' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'calls', label: 'Calls' },
  { id: 'about', label: 'About' },
]

function Toggle({ active, onToggle, label }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
      <button type="button" onClick={onToggle} className={`relative h-6 w-11 rounded-full transition ${active ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${active ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

export default function Navbar({ darkMode, onToggleDarkMode }) {
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser())
  const navigate = useNavigate()

  useEffect(() => {
    const sync = () => setCurrentUser(authService.getCurrentUser())
    window.addEventListener('auth-change', sync)
    window.addEventListener('auth-expired', sync)
    return () => {
      window.removeEventListener('auth-change', sync)
      window.removeEventListener('auth-expired', sync)
    }
  }, [])

  const logout = () => {
    authService.logout()
    window.dispatchEvent(new Event('auth-change'))
    navigate('/login')
    setOpen(false)
    setUserMenuOpen(false)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/[.07] dark:bg-[#090b14]/80">
      <nav className="mx-auto flex h-[64px] max-w-[1600px] items-center justify-between px-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <span className="font-display text-lg font-bold tracking-tight text-slate-950 dark:text-white">PeerShare</span>
          <span className="hidden rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-600 sm:block dark:text-indigo-300">P2P</span>
        </NavLink>

        <div className="hidden items-center gap-1 md:flex">
          {currentUser && (
            <>
              <label className="relative mr-3 hidden xl:block">
                <span className="pointer-events-none absolute left-3 top-2 text-xs text-slate-500">⌕</span>
                <input aria-label="Global search" placeholder="Search workspace" className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-white/10 dark:bg-white/[.04] dark:text-white dark:placeholder:text-slate-600" />
              </label>

              {links.map(link => (
                <NavLink key={link.to} to={link.to} className={navClass}>{link.label}</NavLink>
              ))}

              <button title="Notifications" className="ml-2 grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-white dark:hover:bg-white/10">◌</button>
            </>
          )}

          {!currentUser && (
            <>
              <NavLink to="/login" className={navClass}>Sign in</NavLink>
              <NavLink to="/register" className="ml-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-500">Create account</NavLink>
            </>
          )}

          {currentUser && (
            <div className="relative ml-3">
              <button type="button" onClick={() => setUserMenuOpen((value) => !value)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-left transition hover:border-indigo-300 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[.04] dark:hover:border-indigo-500/50 dark:hover:bg-white/[.08]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600 text-[10px] font-bold text-white">{currentUser.userId.slice(0, 2).toUpperCase()}</span>
                <span className="hidden text-[11px] font-semibold text-slate-700 dark:text-slate-200 sm:block">@{currentUser.userId}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#0f172a] dark:shadow-black/30">
                  <button type="button" className="w-full rounded-xl px-2 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Profile</button>
                  <button type="button" className="w-full rounded-xl px-2 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Settings</button>
                  <button type="button" onClick={logout} className="w-full rounded-xl px-2 py-2 text-left text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10">Logout</button>
                </div>
              )}
            </div>
          )}

          <ThemeButton darkMode={darkMode} onToggle={onToggleDarkMode} />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeButton darkMode={darkMode} onToggle={onToggleDarkMode} />
          <button type="button" onClick={() => setOpen(v => !v)} aria-label="Open navigation" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-lg dark:border-white/10 dark:bg-white/5">{open ? '×' : '☰'}</button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0c0f1c] md:hidden">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1">
            {currentUser ? (
              <>
                <p className="px-3 py-2 text-xs font-bold text-indigo-500">Signed in as @{currentUser.userId}</p>
                {links.map(link => (
                  <NavLink key={link.to} to={link.to} className={navClass} onClick={() => setOpen(false)}>{link.label}</NavLink>
                ))}
                <button onClick={logout} className="rounded-lg px-3 py-2 text-left text-xs font-bold text-rose-500 hover:bg-rose-500/10">Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>Sign in</NavLink>
                <NavLink to="/register" className={navClass} onClick={() => setOpen(false)}>Create account</NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
