// src/version.js
import pkg from '../package.json'

// Basic app version straight from package.json
export const APP_VERSION = pkg.version || '0.0.0'

// Vite exposes the current mode as import.meta.env.MODE
// - 'development' when running `npm run dev`
// - 'production' when built for Netlify
export const APP_ENV = import.meta.env.MODE || 'development'

// Final label to show in the UI
export const APP_VERSION_LABEL = `v${APP_VERSION} • ${APP_ENV}`
