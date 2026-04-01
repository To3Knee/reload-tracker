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
        // Don't precache heavy vendor chunks — runtime-cache them on first use instead.
        // Saves ~870KB from the initial PWA install payload.
        globIgnores: ['**/vendor-charts-*.js', '**/vendor-scanner-*.js', '**/vendor-qr-*.js'],
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
          {
            // Heavy vendor chunks: cache on first use, serve from cache thereafter
            urlPattern: /\/assets\/vendor-(charts|scanner|qr)-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vendor-chunks',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
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
