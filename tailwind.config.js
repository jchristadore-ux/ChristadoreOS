/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm, domestic palette. Sand = surfaces, clay = the single accent.
        sand: {
          50: '#FAF7F2',
          100: '#F4EFE7',
          200: '#E9E1D5',
          300: '#D9CDBB',
          400: '#BFAE96',
          500: '#9C8B72',
        },
        clay: {
          50: '#FBF1EA',
          100: '#F5DFCE',
          200: '#E8BE9E',
          300: '#DA9A6D',
          400: '#C2703D',
          500: '#A85C2E',
          600: '#8A4A24',
        },
        ink: {
          400: '#8B8279',
          500: '#6B635B',
          600: '#4A443E',
          700: '#332F2B',
        },
      },
      fontFamily: {
        sans: ['ui-rounded', 'Nunito', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(51, 47, 43, 0.04), 0 6px 20px -8px rgba(51, 47, 43, 0.12)',
        sheet: '0 -8px 40px -12px rgba(51, 47, 43, 0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 160ms ease-out',
        'pop-in': 'pop-in 160ms cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};
