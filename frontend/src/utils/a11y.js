// 값·키 변경 시 index.html 부트 스크립트와 반드시 동기화 (fontScale과 같은 규약)
const CONTRAST_KEY = 'dumpit-contrast'
const BOLD_KEY = 'dumpit-bold-text'
const CONTRAST_MQ = '(prefers-contrast: more)'

export const CONTRAST_OPTIONS = [
  { value: 'system', label: '시스템' },
  { value: 'high', label: '고대비' },
  { value: 'normal', label: '기본' },
]

export function getContrastPref() {
  const v = localStorage.getItem(CONTRAST_KEY)
  return v === 'high' || v === 'normal' ? v : 'system'
}

function systemPrefersContrast() {
  return typeof matchMedia === 'function' && matchMedia(CONTRAST_MQ).matches
}

export function applyContrast(pref) {
  if (pref === 'system') localStorage.removeItem(CONTRAST_KEY)
  else localStorage.setItem(CONTRAST_KEY, pref)
  const high = pref === 'high' || (pref === 'system' && systemPrefersContrast())
  if (high) document.documentElement.dataset.contrast = 'high'
  else delete document.documentElement.dataset.contrast
}

export function watchSystemContrast() {
  if (typeof matchMedia !== 'function') return () => {}
  const mq = matchMedia(CONTRAST_MQ)
  const onChange = () => { if (getContrastPref() === 'system') applyContrast('system') }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export function getBoldTextPref() {
  return localStorage.getItem(BOLD_KEY) === '1'
}

export function applyBoldText(on) {
  if (on) {
    localStorage.setItem(BOLD_KEY, '1')
    document.documentElement.dataset.boldText = '1'
  } else {
    localStorage.removeItem(BOLD_KEY)
    delete document.documentElement.dataset.boldText
  }
}
