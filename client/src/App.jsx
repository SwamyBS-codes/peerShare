import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import About from './pages/About'
import Home from './pages/Home'
import HowItWorks from './pages/HowItWorks'
import NearbyShare from './pages/NearbyShare'
import ReceiveFile from './pages/ReceiveFile'
import SendFile from './pages/SendFile'

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const persisted = localStorage.getItem('peershare-theme')
    return persisted ? persisted === 'dark' : true // Default to dark mode for premium feel
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', darkMode)
    localStorage.setItem('peershare-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <BrowserRouter>
      <div className="relative min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 overflow-hidden flex flex-col justify-between">
        
        {/* Animated background highlights */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/10 dark:bg-indigo-500/5 blur-[120px] pointer-events-none float-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-400/10 dark:bg-cyan-500/5 blur-[150px] pointer-events-none float-slower" />

        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar darkMode={darkMode} onToggleDarkMode={() => setDarkMode((v) => !v)} />
          <main className="flex-grow flex items-center justify-center pt-24 pb-12">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/send" element={<SendFile />} />
              <Route path="/receive" element={<ReceiveFile />} />
              <Route path="/nearby" element={<NearbyShare />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
          
          <footer className="w-full text-center py-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/40 dark:border-slate-800/30 backdrop-blur-sm">
            <p>© {new Date().getFullYear()} PeerShare. Built with WebRTC & WebSocket signaling. No file logging.</p>
          </footer>
        </div>
      </div>
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
