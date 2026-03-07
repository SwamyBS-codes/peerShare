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
        `hover-lift rounded-full px-4 py-2 text-sm font-semibold transition ${
          isActive
            ? 'bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300'
            : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-700/50'
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
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/70">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <NavLink to="/" className="group inline-flex items-center gap-3 text-xl font-black tracking-tight text-slate-900 dark:text-white">
          <BrandMark className="h-10 w-10 transition duration-300 group-hover:rotate-6" />
          <span>PeerShare</span>
        </NavLink>

        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} />
          ))}
          <a
            href="https://github.com/swamybs2005"
            target="_blank"
            rel="noreferrer"
            className="hover-lift rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-700/50"
          >
            GitHub
          </a>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="hover-lift rounded-full border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-500 hover:text-sky-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-300 dark:hover:text-sky-300"
          >
            {darkMode ? 'Sun' : 'Moon'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 md:hidden dark:border-slate-700 dark:text-slate-200"
        >
          Menu
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} onClick={() => setOpen(false)} />
            ))}
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-700/50"
            >
              GitHub
            </a>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="rounded-full border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
