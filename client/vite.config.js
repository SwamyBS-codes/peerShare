// Configures the React development/build pipeline and routes API calls to the selected backend.
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Use localhost during development and the deployed backend for production builds.
  const { VITE_API_URL } = loadEnv(mode, '.', '')
  const defaultBackendUrl = mode === 'development'
    ? 'http://localhost:3001'
    : 'https://peershare-signalling.duckdns.org'
  const backendUrl = VITE_API_URL || defaultBackendUrl

  return {
    plugins: [react()],
    define: {
      __BACKEND_URL__: JSON.stringify(backendUrl),
    },
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        }
      }
    }
  }
})
