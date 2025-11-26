/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#1a1a1a',
        card: '#1f1f1f',
        red: {
          500: '#b33c3c',
          600: '#a83232',
          700: '#8b2a2a',
        },
        gray: {
          100: '#e8e1d4',
          300: '#999488',
          700: '#444444',
          900: '#1a1a1a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}