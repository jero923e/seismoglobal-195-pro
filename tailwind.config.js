/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        seismic: {
          dark: '#0a0d14',
          card: '#111726',
          border: '#1e293b',
          accent: '#00f2fe',
          alert: '#ef4444',
          warning: '#f59e0b',
          safe: '#10b981',
          calibrating: '#6366f1'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-ping': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'seismic-wave': 'wave 1.5s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(0.2)' },
          '50%': { transform: 'scaleY(1)' },
        }
      }
    },
  },
  plugins: [],
}
