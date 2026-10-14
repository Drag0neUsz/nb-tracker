import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces so phones on the same hotspot/LAN can connect.
    host: true,
    port: 5173,
  },
})