import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // In development, Vite proxies /api and /webhook requests to Express on port 3000.
  // This means you only need to visit http://localhost:5173 and all API calls
  // go to the backend automatically — no CORS issues, feels like one app.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/webhook': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // Output to dist/ when building for production
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
