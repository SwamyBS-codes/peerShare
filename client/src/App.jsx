import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import About from './pages/About'
import HowItWorks from './pages/HowItWorks'
import NearbyShare from './pages/NearbyShare'
import ReceiveFile from './pages/ReceiveFile'
import SendFile from './pages/SendFile'
import Login from './pages/Login'
import Register from './pages/Register'
import ChatHub from './pages/ChatHub'
import { authService } from './services/authService'

function AppContent({ darkMode, setDarkMode, currentUser }) {
  const location = useLocation()
  // Hide footer on dashboard and file share pages to enable full-screen views
  const isDashboardOrShare = ['/', '/send', '/receive', '/nearby'].includes(location.pathname)

  return (
    <div className={`relative ${isDashboardOrShare ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-between`}>
      
      {/* Animated background highlights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/10 dark:bg-indigo-500/5 blur-[120px] pointer-events-none float-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-400/10 dark:bg-cyan-500/5 blur-[150px] pointer-events-none float-slower" />

      <div className={`relative z-10 flex flex-col ${isDashboardOrShare ? 'h-full overflow-hidden' : 'min-h-screen'}`}>
        <Navbar darkMode={darkMode} onToggleDarkMode={() => setDarkMode((v) => !v)} />
        <main className={`flex-grow flex flex-col pt-20 ${isDashboardOrShare ? 'pb-4 h-[calc(100vh-80px)] overflow-hidden' : 'pb-12'}`}>
          <Routes>
            {/* Protected Routes */}
            <Route 
              path="/" 
              element={currentUser ? <ChatHub /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/send" 
              element={currentUser ? <SendFile /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/receive" 
              element={currentUser ? <ReceiveFile /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/nearby" 
              element={currentUser ? <NearbyShare /> : <Navigate to="/login" replace />} 
            />

            {/* Guest / Public Routes */}
            <Route 
              path="/login" 
              element={!currentUser ? <Login /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/register" 
              element={!currentUser ? <Register /> : <Navigate to="/" replace />} 
            />

            {/* Static Pages */}
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        {!isDashboardOrShare && (
          <footer className="w-full text-center py-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/40 dark:border-slate-800/30 backdrop-blur-sm">
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
