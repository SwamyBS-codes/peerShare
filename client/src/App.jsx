import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import About from './pages/About'
import HowItWorks from './pages/HowItWorks'

import Login from './pages/Login'
import Register from './pages/Register'
import ChatHub from './pages/ChatHub'
import { authService } from './services/authService'

function AppContent({ darkMode, setDarkMode, currentUser }) {
  const location = useLocation()
  const isAuthRoute = ['/login', '/register'].includes(location.pathname)
  const isDashboardOrShare = ['/'].includes(location.pathname)

  return (
    <div className={`app-shell relative ${isDashboardOrShare ? 'h-screen overflow-hidden' : 'min-h-screen'} text-slate-900 transition-colors duration-300 dark:text-slate-100 flex flex-col justify-between`}>
      {!isAuthRoute && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/10 dark:bg-indigo-500/5 blur-[120px] pointer-events-none float-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-400/10 dark:bg-cyan-500/5 blur-[150px] pointer-events-none float-slower" />
        </>
      )}

      <div className={`relative z-10 flex flex-col ${isDashboardOrShare ? 'h-full overflow-hidden' : 'min-h-screen'}`}>
        {!isAuthRoute && <Navbar darkMode={darkMode} onToggleDarkMode={() => setDarkMode((v) => !v)} />}
        <main className={`${isAuthRoute ? 'h-full w-full' : `h-full w-full pt-[76px] ${isDashboardOrShare ? 'pb-3 px-2 sm:px-4 overflow-hidden' : 'pb-12'}`}`}>
          <Routes>
            <Route
              path="/"
              element={currentUser ? <ChatHub darkMode={darkMode} /> : <Navigate to="/login" replace />}
            />

            <Route
              path="/login"
              element={!currentUser ? <Login /> : <Navigate to="/" replace />}
            />
            <Route
              path="/register"
              element={!currentUser ? <Register /> : <Navigate to="/" replace />}
            />

            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {!isAuthRoute && !isDashboardOrShare && (
          <footer className="w-full border-t border-slate-200/40 py-6 text-center text-xs text-slate-400 backdrop-blur-sm dark:border-slate-800/30 dark:text-slate-500">
            <p>© {new Date().getFullYear()} PeerShare. Built with WebRTC & WebSocket signaling. Secure P2P communication.</p>
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
        position="bottom-right" 
        toastOptions={{ 
          duration: 3000,
          style: {
            background: darkMode ? '#1e293b' : '#ffffff',
            color: darkMode ? '#f8fafc' : '#0f172a',
            border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
          }
        }} 
      />
    </BrowserRouter>
  )
}

export default App
