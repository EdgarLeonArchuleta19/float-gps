/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#032347',
          orange: '#f87203',
        },
        apple: {
          bg: '#f5f5f7',
          dark: '#0a0a0a',
          card: '#ffffff',
          cardDark: '#111111',
          border: '#e5e5e5',
          borderDark: '#222222',
          text: '#1d1d1f',
          textDark: '#f5f5f7',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
