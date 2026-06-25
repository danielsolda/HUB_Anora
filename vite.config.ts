import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Em desenvolvimento, encaminha /api para o backend (npm run server).
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
