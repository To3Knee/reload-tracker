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
        // Base surfaces — clean neutral dark, lets brass/copper accents own the warmth
        bg:      '#0a0a0c',
        surface: '#111113',
        card:    '#181819',
        overlay: '#1e1e21',

        // Primary accent — rifle red
        red: {
          400: '#e05252',
          500: '#c42b21',
          600: '#a82418',
          700: '#8b1e16',
          900: '#2d1111',
        },

        // Secondary accent — steel blue (precision, tactical)
        copper: {
          300: '#93bcec',
          400: '#6ba0df',
          500: '#4d8fd6',
          600: '#3373b8',
          700: '#1e508f',
          900: '#0a1e3d',
        },

        // Tertiary accent — light steel blue (data readouts, highlights)
        brass: {
          300: '#b8d4f4',
          400: '#7ab3e8',
          500: '#5a9bdb',
          600: '#3e7fc5',
        },

        // Neutral steel — clean grays, no warm or cool cast
        // Brass/copper accents provide all the warmth; steel stays out of the way
        steel: {
          50:  '#f4f4f6',
          100: '#e8e8ec',
          200: '#c8c8d0',
          300: '#9898a4',
          400: '#686874',
          500: '#484854',
          600: '#34343e',
          700: '#26262e',
          800: '#1a1a20',
          900: '#10101a',
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
