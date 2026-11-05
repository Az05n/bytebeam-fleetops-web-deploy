/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 20px 44px rgba(15, 23, 42, 0.2)',
      },
      colors: {
        panel: '#111827',
        accent: '#22d3ee',
        good: '#34d399',
        warn: '#f59e0b',
        critical: '#f87171',
      },
    },
  },
  plugins: [],
}
