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
        bg:      '#080808',
        surface: '#0f0f0f',
        card:    '#141414',
        overlay: '#1a1a1a',
        // Primary accent — tactical red
        red: {
          400: '#e05252',
          500: '#c0392b',
          600: '#a83232',
          700: '#8b2a2a',
          900: '#2d1111',
        },
        // Secondary accent — copper/brass (the material of the cartridge)
        copper: {
          300: '#dda05a',
          400: '#c87941',
          500: '#b87333',
          600: '#9a5f28',
          700: '#7a4a1e',
          900: '#2a1a0a',
        },
        brass: {
          300: '#e8c875',
          400: '#d4a843',
          500: '#c49528',
          600: '#a87e1e',
        },
        // Neutral steel scale
        steel: {
          100: '#e2e4e8',
          200: '#c8ccd4',
          300: '#a8adb8',
          400: '#7a8190',
          500: '#555c6a',
          600: '#363c48',
          700: '#252a34',
          800: '#181c24',
          900: '#0e1018',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'sm': '3px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
      animation: {
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },                          to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
