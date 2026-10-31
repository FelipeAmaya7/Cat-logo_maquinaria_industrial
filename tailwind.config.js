/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * Grafito: la base del sistema.
         *
         * Sustituye al azul marino anterior. Un fondo neutro deja que el color
         * SIGNIFIQUE algo: cuando la estructura también es azul, el azul de un
         * botón y el de un enlace dejan de destacar.
         */
        grafito: {
          50: '#F7F8FA',
          100: '#EEF0F4',
          200: '#DDE1E8',
          300: '#BFC6D2',
          400: '#8C96A8',
          500: '#616C80',
          600: '#444E60',
          700: '#2E3645',
          800: '#1C2231',
          900: '#141B2D',
          950: '#0B0F19',
        },

        /**
         * Acento de marca, un solo color.
         *
         * Teal y no azul por dos razones: se distingue del azul de los enlaces
         * del navegador, y sobre todo no compite con los colores de estado
         * (verde, ámbar, rojo), que en mantenimiento son lo que de verdad
         * informa.
         */
        acento: {
          50: '#EFFAF8',
          100: '#D2F2EC',
          200: '#A6E5DB',
          300: '#6FD1C4',
          400: '#38B6A8',
          500: '#17998D',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },

        /**
         * Criticidad: una misma familia con intensidad creciente.
         *
         * No son colores distintos sin relación entre sí; el ojo lee la escala
         * y sabe de inmediato cuál arde, sin tener que descifrar una leyenda.
         */
        criticidad: {
          baja: '#EEF0F4',
          media: '#FEF3C7',
          alta: '#FED7AA',
          critica: '#FECACA',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
