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
    return persisted ? persisted === 'dark' : false
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', darkMode)
    localStorage.setItem('peershare-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#fef3c7_0%,#eff6ff_50%,#f8fafc_100%)] text-slate-900 transition-colors dark:bg-[radial-gradient(circle_at_10%_0%,#0f172a_0%,#111827_55%,#020617_100%)] dark:text-white">
        <Navbar darkMode={darkMode} onToggleDarkMode={() => setDarkMode((v) => !v)} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/send" element={<SendFile />} />
          <Route path="/receive" element={<ReceiveFile />} />
          <Route path="/nearby" element={<NearbyShare />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
      <Toaster position="top-right" toastOptions={{ duration: 2400 }} />
    </BrowserRouter>
  )
}

export default App
