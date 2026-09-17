import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During development the Vite server proxies /api -> FastAPI on :8000.
// In production set VITE_API_BASE to the deployed backend URL.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
