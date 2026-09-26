/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b7d0ff',
          300: '#8bb1ff',
          400: '#5c8bff',
          500: '#3562f5',
          600: '#2444d6',
          700: '#1e37ac',
          800: '#1c318a',
          900: '#1c2e6e',
          950: '#141d42',
        },
      },
    },
  },
  plugins: [],
};
