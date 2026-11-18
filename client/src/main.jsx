import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker only in production.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log(
          '[PWA] Service Worker registered:',
          registration.scope
        )
      })
      .catch((error) => {
        console.error(
          '[PWA] Service Worker registration failed:',
          error
        )
      })
  })
}