/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    screens: {
      sm:  '640px',
      md:  '768px',
      lg:  '1024px',
      xl:  '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Surface colors — reference CSS vars so they flip with the theme
        // Stored as RGB triplets so Tailwind opacity modifiers work (bg-surface/50 etc.)
        bg:      'rgb(var(--bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        card:    'rgb(var(--card-rgb) / <alpha-value>)',
        overlay: 'rgb(var(--overlay-rgb) / <alpha-value>)',

        // Primary accent — rifle red (same in both themes)
        red: {
          400: '#e05252',
          500: '#c42b21',
          600: '#a82418',
          700: '#8b1e16',
          900: '#2d1111',
        },

        // Secondary / tertiary accents (same in both themes)
        copper: {
          300: '#f08888',
          400: '#e05252',
          500: '#c42b21',
          600: '#a82418',
          700: '#8b1e16',
          900: '#2d1111',
        },
        brass: {
          300: '#f4aaaa',
          400: '#e87070',
          500: '#e05252',
          600: '#c42b21',
        },

        // Neutral steel — flips with theme via CSS vars (RGB triplets for opacity support)
        steel: {
          50:  'rgb(var(--steel-50)  / <alpha-value>)',
          100: 'rgb(var(--steel-100) / <alpha-value>)',
          200: 'rgb(var(--steel-200) / <alpha-value>)',
          300: 'rgb(var(--steel-300) / <alpha-value>)',
          400: 'rgb(var(--steel-400) / <alpha-value>)',
          500: 'rgb(var(--steel-500) / <alpha-value>)',
          600: 'rgb(var(--steel-600) / <alpha-value>)',
          700: 'rgb(var(--steel-700) / <alpha-value>)',
          800: 'rgb(var(--steel-800) / <alpha-value>)',
          900: 'rgb(var(--steel-900) / <alpha-value>)',
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
