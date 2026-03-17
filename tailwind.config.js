/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1D2C4D',
          light: '#2A4070',
          dark: '#141E35',
        },
        accent: {
          DEFAULT: '#FAB81F',
          light: '#FDD66B',
        },
        background: '#F7F8FA',
        success: '#27AE60',
        error: '#E74C3C',
        warning: '#F39C12',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        heading: ['Bahnschrift', 'sans-serif'],
      },
      borderRadius: {
        button: '12px',
        card: '16px',
      },
    },
  },
  plugins: [],
};
