import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow mobile devices on LAN to connect and test DeviceMotion!
    port: 5173
  }
})
