module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        navy: '#032347',
        accent: '#f87203',
        ink: {
          bg: '#131316',
          card: '#1b1b1f',
          input: '#232329',
          border: '#33343c',
          modal: '#202024',
          active: '#2a2b31',
        },
        paper: {
          bg: '#f5f5f7',
          card: '#ffffff',
          border: '#e5e5e5',
        },
      },
    },
  },
  plugins: [],
};
