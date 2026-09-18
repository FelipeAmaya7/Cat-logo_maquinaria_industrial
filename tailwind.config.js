/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta institucional del catálogo
        industrial: {
          50: '#f3f6fa',
          100: '#e4eaf2',
          200: '#c6d3e4',
          300: '#9bb0cd',
          400: '#6885af',
          500: '#476595',
          600: '#37507b',
          700: '#2d4063',
          800: '#233150',
          900: '#1b2540',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
