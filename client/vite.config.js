import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const BACKEND_URL = 'https://peershare-signalling.duckdns.org';

// const BACKEND_URL = 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  define: {
    __BACKEND_URL__: JSON.stringify(BACKEND_URL),
  },
  server: {
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      }
    }
  }
})
