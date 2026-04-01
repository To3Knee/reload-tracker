import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      manifest: {
        name: 'Reload Tracker',
        short_name: 'Reload Tracker',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#b33c3c',
        orientation: 'portrait',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
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
