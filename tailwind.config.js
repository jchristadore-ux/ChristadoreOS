/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette taken from the ChristadoreOS mark: a cyan-to-violet gradient
        // on a cool lavender-grey ground, with a near-black navy for type.
        mist: {
          50: '#F7F8FC',
          100: '#EFF1F8',
          200: '#E2E6F1',
          300: '#CDD3E5',
          400: '#A5AEC8',
          500: '#7C859F',
        },
        iris: {
          50: '#F2EFFE',
          100: '#E4DDFD',
          200: '#C7BAFA',
          300: '#A08DF5',
          400: '#6D4FEC',
          500: '#4F2BE7',
          600: '#3F1FBE',
        },
        // The two ends of the logo gradient, for the wordmark and accents.
        beam: {
          start: '#07BCF1',
          mid: '#4F2BE7',
          end: '#6825C2',
        },
        ink: {
          400: '#7A8199',
          500: '#586074',
          600: '#343B57',
          700: '#151A35',
        },
      },
      fontFamily: {
        sans: ['ui-rounded', 'Nunito', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'beam-gradient': 'linear-gradient(135deg, #07BCF1 0%, #4F2BE7 58%, #6825C2 100%)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(21, 26, 53, 0.04), 0 6px 20px -8px rgba(21, 26, 53, 0.14)',
        sheet: '0 -8px 40px -12px rgba(21, 26, 53, 0.28)',
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
