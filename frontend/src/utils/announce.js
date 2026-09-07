export const ANNOUNCER_ID = 'a11y-announcer'

// 같은 문구를 연속 발화하면 aria-live가 무시하므로 비운 뒤 다음 프레임에 채운다
export function announce(text) {
  if (typeof document === 'undefined' || !text) return
  const el = document.getElementById(ANNOUNCER_ID)
  if (!el) return
  el.textContent = ''
  requestAnimationFrame(() => { el.textContent = text })
}
