/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Open Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      screens: {
        'kiosk': '1080px',
      },
      fontSize: {
        'clamp-title': 'clamp(28px, 4vw, 72px)',
        'clamp-body': 'clamp(16px, 2.2vw, 32px)',
        'clamp-button': 'clamp(20px, 3vw, 40px)',
      },
      spacing: {
        '1p': '1%',
        '2p': '2%',
        '3p': '3%',
        '4p': '4%',
        '5p': '5%',
      },
      colors: {
        primary: '#0f1115',
        secondary: '#d1d5db',
        surface: '#1c1f26',
      },
      backgroundImage: {
        'kiosk-gradient':
          'radial-gradient(circle at 20% 20%, rgba(209,213,219,0.12), transparent 36%), radial-gradient(circle at 82% 8%, rgba(75,85,99,0.18), transparent 32%), linear-gradient(180deg, #0f1115 0%, #07080c 100%)',
      },
    },
  },
  plugins: [],
}

