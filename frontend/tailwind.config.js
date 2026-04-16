/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 덤핏 디자인 토큰
        primary:   '#E05D5D',   // Muted Bold Red
        secondary: '#FF8C42',   // Solid Orange
        accent:    '#F9F9F9',   // Off White
        dark:      '#1A1A1A',   // 텍스트/외곽선
      },
      fontFamily: {
        sans: ['Mona12', 'system-ui', 'sans-serif'],
        display: ['"Press Start 2P"', 'Mona12', 'sans-serif'],
      },
      boxShadow: {
        // 키치한 굵은 그림자
        'kitschy':    '4px 4px 0px #1A1A1A',
        'kitschy-lg': '6px 6px 0px #1A1A1A',
        'kitschy-xl': '8px 8px 0px #1A1A1A',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
