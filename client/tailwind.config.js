/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette taken from the "Shri Arbuda Medical & General Store" shop
        // banner: bright yellow field, royal-blue name, red accents, a
        // magenta/pink border and a green medical cross.
        accent: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c3cfff',
          300: '#9aacff',
          400: '#6b83fb',
          500: '#4459ec',
          600: '#2e3fd0',
          700: '#2433a8',
          800: '#1f2c85',
          900: '#141f6b',
        },
        brand: {
          yellow: '#FFE100',
          'yellow-soft': '#FFF4A8',
          blue: '#14228f',
          'blue-dark': '#0b1566',
          red: '#ED1C24',
          magenta: '#D6006E',
          pink: '#F0369B',
          green: '#14A44D',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(24px, -18px) scale(1.06)' },
          '66%': { transform: 'translate(-18px, 16px) scale(0.96)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        morph: {
          '0%, 100%': { borderRadius: '42% 58% 60% 40% / 45% 45% 55% 55%' },
          '50%': { borderRadius: '58% 42% 40% 60% / 55% 55% 45% 45%' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        blob: 'blob 16s ease-in-out infinite',
        'scale-in': 'scale-in 260ms ease-out',
        'gradient-x': 'gradient-x 6s ease infinite',
        morph: 'morph 12s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
