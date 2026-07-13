const KEY = 'dumpit-font-scale'

// 값 변경 시 index.html 부트 스크립트의 scales 맵과 반드시 동기화
export const FONT_SCALES = {
  sm:   { label: '작게', size: '90%' },
  base: { label: '기본', size: '100%' },
  lg:   { label: '크게', size: '112.5%' },
  xl:   { label: '아주 크게', size: '125%' },
}

export function getFontScalePref() {
  const v = localStorage.getItem(KEY)
  return v !== null && v !== 'base' && FONT_SCALES[v] ? v : 'base'
}

export function applyFontScale(pref) {
  if (pref === 'base') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, pref)
  document.documentElement.style.fontSize = pref === 'base' ? '' : FONT_SCALES[pref].size
}
