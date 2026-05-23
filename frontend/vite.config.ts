import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:5000', // Points to backend service inside the Docker network, fallback to localhost:5000 locally
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
