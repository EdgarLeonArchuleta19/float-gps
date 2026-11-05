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
          tonal: '#26262c',
          selected: '#1b2c42',
        },
        paper: {
          bg: '#f3f3f6',
          card: '#ffffff',
          border: '#ececef',
          tonal: '#eff1f5',
          selected: '#e2e8f0',
        },
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '28px',
      },
    },
  },
  plugins: [],
};
