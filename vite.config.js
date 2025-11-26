import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // This line fixes the white-screen-of-death on Netlify
  base: '/',
})