/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 덤핏 디자인 토큰 — 라이트/다크 값은 index.css의 CSS 변수 참조
        // 주의: var() 참조라 text-dark/40 같은 알파 수식은 동작하지 않음 → text-sub 사용
        primary:     'var(--accent)',
        secondary:   'var(--accent2)',
        accent:      'var(--bg)',
        dark:        'var(--fg)',
        card:        'var(--card)',
        line:        'var(--line)',
        edge:        'var(--edge)',
        chip:        'var(--chip)',
        sub:         'var(--sub)',
        'on-accent': 'var(--on-accent)',
      },
      fontFamily: {
        sans: ['Mona12', 'system-ui', 'sans-serif'],
        display: ['"Press Start 2P"', 'Mona12', 'sans-serif'],
        dungeon: ['RoundedFixedsys', 'sans-serif'],
      },
      boxShadow: {
        retro:      '3px 3px 0 var(--shadow-sm)',
        'retro-lg': '5px 5px 0 var(--shadow-hero)',
        // 구 이름 별칭 — 전 화면 즉시 전환용, 개명 완료 후 제거 예정
        'kitschy':    '3px 3px 0 var(--shadow-sm)',
        'kitschy-lg': '5px 5px 0 var(--shadow-hero)',
        'kitschy-xl': '5px 5px 0 var(--shadow-hero)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
