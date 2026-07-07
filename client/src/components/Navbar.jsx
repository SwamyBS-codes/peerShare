import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import BrandMark from './BrandMark'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/send', label: 'Send File' },
  { to: '/receive', label: 'Receive File' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/about', label: 'About' },
]

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `relative px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase transition-all duration-300 rounded-2xl ${isActive
          ? 'bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-400/20'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/40 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/20 border border-transparent'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function Navbar({ darkMode, onToggleDarkMode }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl rounded-[28px] glass-panel border border-white/20 dark:border-slate-800/40 shadow-xl transition-all duration-300">
      <nav className="mx-auto flex items-center justify-between px-6 py-3.5">
        <NavLink to="/" className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          <BrandMark className="h-8 w-8" />
          <span className="font-display tracking-wide font-extrabold bg-gradient-to-r from-slate-950 via-slate-800 to-indigo-600 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-indigo-400">
            PeerShare
          </span>
        </NavLink>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} />
          ))}

          <button
            type="button"
            onClick={onToggleDarkMode}
            className="ml-2 p-2.5 rounded-2xl border border-slate-200/60 bg-white/40 hover:bg-slate-100 dark:border-slate-850 dark:bg-slate-900/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 transition-all duration-300"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-850 text-slate-700 dark:text-slate-350"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-850 text-slate-700 dark:text-slate-350"
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Panel */}
      {open && (
        <div className="border-t border-slate-200/40 bg-white/95 px-6 py-4 md:hidden dark:border-slate-800/40 dark:bg-slate-950/95 rounded-b-[28px] shadow-lg animate-fadeIn">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} onClick={() => setOpen(false)} />
            ))}
            <a
              href="https://github.com/swamybs2005"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              onClick={() => setOpen(false)}
            >
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
