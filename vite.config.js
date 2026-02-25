import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // This line fixes the white-screen-of-death on Netlify
  base: '/',
  build: {
    // Split heavy third-party libs into separate chunks so the main bundle stays lean.
    // Users only download chart/scanner code when they actually navigate to those tabs.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts':  ['recharts'],
          'vendor-icons':   ['lucide-react'],
          'vendor-scanner': ['html5-qrcode'],
          'vendor-qr':      ['qrcode'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})