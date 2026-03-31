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
        // Base surfaces — warm oiled-steel, not cold black
        bg:      '#0c0b09',
        surface: '#141210',
        card:    '#1a1714',
        overlay: '#222018',

        // Primary accent — rifle red
        red: {
          400: '#e05252',
          500: '#c42b21',
          600: '#a82418',
          700: '#8b1e16',
          900: '#2d1111',
        },

        // Secondary accent — copper (the material of the primer pocket)
        copper: {
          300: '#dda05a',
          400: '#c87941',
          500: '#b87333',
          600: '#9a5f28',
          700: '#7a4a1e',
          900: '#2a1a0a',
        },

        // Tertiary accent — brass (the material of the case)
        brass: {
          300: '#e8c875',
          400: '#d4a843',
          500: '#c49528',
          600: '#a87e1e',
        },

        // Neutral warm steel — aligns with CSS custom property warm tone
        // Cold blue-grays replaced with warm brown-grays
        steel: {
          50:  '#f2ede6',
          100: '#e8e0d4',
          200: '#c8bfb0',
          300: '#a09080',
          400: '#787068',
          500: '#565050',
          600: '#3a3530',
          700: '#2a2520',
          800: '#1e1a14',
          900: '#14100a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'sm':  '2px',
        DEFAULT: '3px',
        'md':  '4px',
        'lg':  '6px',
        'xl':  '8px',
        '2xl': '12px',
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-up':   'slideUp 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },                               to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
