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
        warn:        'var(--warn)',
        'on-accent': 'var(--on-accent)',
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', '"Malgun Gothic"', 'system-ui', 'sans-serif'],
        dungeon: ['DungGeunMo', '"Malgun Gothic"', 'monospace'],
        // 디스플레이 층 (히어로 멘트·섹션 제목·태스크 제목·네비) — 400/700 두 굵기
        galmuri: ['Galmuri11', '"Pretendard Variable"', 'Pretendard', 'sans-serif'],
      },
      boxShadow: {
        retro:      '3px 3px 0 var(--shadow-sm)',
        'retro-lg': '5px 5px 0 var(--shadow-hero)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
