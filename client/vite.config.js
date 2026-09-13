import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // ב-dev ה-client רץ על 5173 וה-socket מתחבר ל-origin שלו,
    // לכן מפנים את תעבורת socket.io לשרת שרץ על 3001.
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
