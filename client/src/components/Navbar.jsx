import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import BrandMark from './BrandMark'
import { IconMenu, IconMoon, IconSun } from './icons/MessageIcons'

const links = [
  { to: '/', label: 'Chats' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
]

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-chat-accent/10 text-chat-accent dark:text-chat-accentLight'
      : 'text-chat-muted hover:bg-black/[0.04] hover:text-[#111b21] dark:text-chat-mutedDark dark:hover:bg-white/[0.06] dark:hover:text-[#e9edef]'
  }`

function ThemeButton({ darkMode, onToggle }) {
  return (
    <button type="button" onClick={onToggle} aria-label="Toggle theme" className="icon-btn">
      {darkMode ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
    </button>
  )
}

export default function Navbar({ darkMode, onToggleDarkMode }) {
  const [open, setOpen] = useState(false)
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
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-chat-border bg-chat-sidebar/95 backdrop-blur-md dark:border-chat-borderDark dark:bg-chat-sidebarDark/95">
      <nav className="mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink to="/" className="flex min-w-0 items-center gap-2.5">
          <BrandMark className="h-9 w-9" />
          <span className="truncate text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">PeerShare</span>
        </NavLink>

        <div className="hidden items-center gap-1 md:flex">
          {currentUser ? (
            <>
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={navClass}>
                  {link.label}
                </NavLink>
              ))}
              <div className="ml-2 flex items-center gap-2 border-l border-chat-border pl-3 dark:border-chat-borderDark">
                <span className="max-w-[120px] truncate text-xs font-medium text-chat-muted dark:text-chat-mutedDark">
                  @{currentUser.userId}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-md px-2 py-1.5 text-xs font-semibold text-chat-danger hover:bg-chat-danger/10"
                >
                  Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>
                Sign in
              </NavLink>
              <NavLink to="/register" className="primary-action ml-1 !py-2 !text-xs">
                Create account
              </NavLink>
            </>
          )}
          <ThemeButton darkMode={darkMode} onToggle={onToggleDarkMode} />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeButton darkMode={darkMode} onToggle={onToggleDarkMode} />
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu" className="icon-btn">
            {open ? <span className="text-lg">×</span> : <IconMenu />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-chat-border bg-chat-sidebar px-4 py-3 dark:border-chat-borderDark dark:bg-chat-sidebarDark md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {currentUser ? (
              <>
                <p className="px-3 py-2 text-xs text-chat-muted dark:text-chat-mutedDark">Signed in as @{currentUser.userId}</p>
                {links.map((link) => (
                  <NavLink key={link.to} to={link.to} className={navClass} onClick={() => setOpen(false)}>
                    {link.label}
                  </NavLink>
                ))}
                <button
                  onClick={logout}
                  className="rounded-md px-3 py-2 text-left text-sm font-semibold text-chat-danger hover:bg-chat-danger/10"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>
                  Sign in
                </NavLink>
                <NavLink to="/register" className={navClass} onClick={() => setOpen(false)}>
                  Create account
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
