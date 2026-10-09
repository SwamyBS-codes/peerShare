import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import About from './pages/About'
import HowItWorks from './pages/HowItWorks'

import Login from './pages/Login'
import Register from './pages/Register'
import ChatHub from './pages/ChatHub'
import LinkConnectPage from './pages/LinkConnectPage'
import { authService } from './services/authService'

function AppContent({ darkMode, setDarkMode, currentUser }) {
  const location = useLocation()
  const isAuthRoute = ['/login', '/register'].includes(location.pathname)
  const isLinkRoute = location.pathname.startsWith('/link/')
  const isMessengerShell = location.pathname === '/'

  return (
    <div
      className={`relative flex flex-col ${
        isMessengerShell || isLinkRoute
          ? 'app-shell-messenger messenger-shell relative h-[100dvh] overflow-hidden'
          : isAuthRoute
            ? 'app-shell h-[100dvh] overflow-hidden'
            : 'app-shell min-h-[100dvh]'
      }`}
    >
      <div className={`relative z-10 flex flex-1 flex-col ${isMessengerShell || isAuthRoute ? 'h-full min-h-0 overflow-hidden' : 'min-h-[100dvh]'}`}>
        {!isAuthRoute && !isMessengerShell && !isLinkRoute && (
          <Navbar darkMode={darkMode} onToggleDarkMode={() => setDarkMode((v) => !v)} />
        )}
        <main
          className={
            isAuthRoute
              ? 'h-full w-full min-h-0'
              : isMessengerShell || isLinkRoute
                ? 'h-full w-full min-h-0 overflow-hidden'
                : 'w-full pt-[60px] pb-10'
          }
        >
          <Routes>
            <Route
              path="/"
              element={currentUser ? <ChatHub darkMode={darkMode} onToggleDarkMode={() => setDarkMode((v) => !v)} /> : <Navigate to="/login" replace />}
            />

            <Route path="/link/:code" element={<LinkConnectPage />} />

            <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!currentUser ? <Register /> : <Navigate to="/" replace />} />

            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {!isAuthRoute && !isMessengerShell && !isLinkRoute && (
          <footer className="border-t border-chat-border py-5 text-center text-xs text-chat-muted dark:border-chat-borderDark dark:text-chat-mutedDark">
            <p>© {new Date().getFullYear()} PeerShare · Direct P2P messaging &amp; file transfer</p>
          </footer>
        )}
      </div>
    </div>
  )
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const persisted = localStorage.getItem('peershare-theme')
    return persisted ? persisted === 'dark' : true
  })

  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser())

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', darkMode)
    localStorage.setItem('peershare-theme', darkMode ? 'dark' : 'light')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#0c0f16' : '#6366f1')
  }, [darkMode])

  useEffect(() => {
    const handleAuth = () => {
      setCurrentUser(authService.getCurrentUser())
    }
    window.addEventListener('auth-change', handleAuth)
    window.addEventListener('auth-expired', handleAuth)
    return () => {
      window.removeEventListener('auth-change', handleAuth)
      window.removeEventListener('auth-expired', handleAuth)
    }
  }, [])

  return (
    <BrowserRouter>
      <AppContent darkMode={darkMode} setDarkMode={setDarkMode} currentUser={currentUser} />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2800,
          style: {
            background: darkMode ? '#202c33' : '#ffffff',
            color: darkMode ? '#e9edef' : '#111b21',
            border: darkMode ? '1px solid #2a3942' : '1px solid #e9edef',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          },
        }}
      />
    </BrowserRouter>
  )
}

export default App
