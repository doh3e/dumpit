const KEY = 'dumpit-theme'

export function getThemePref() {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

export function applyTheme(pref) {
  if (pref === 'system') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, pref)
  const resolved = pref === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : pref
  document.documentElement.dataset.theme = resolved
}

export function watchSystemTheme() {
  const mq = matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => { if (getThemePref() === 'system') applyTheme('system') }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
