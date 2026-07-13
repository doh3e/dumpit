// 서버가 원본, localStorage는 첫 페인트 번쩍임 방지용 캐시
const CACHE_KEY = 'dumpit_equipments'
// CSS로 적용되는 슬롯만 dataset에 반영 (스프라이트 슬롯은 컴포넌트가 user.equipments에서 직접 읽음)
const CSS_SLOTS = { BACKGROUND: 'skinBg', CHROME: 'skinChrome', POMODORO: 'skinPomodoro' }

export function applySkins(equipments) {
  const eq = equipments || {}
  for (const [slot, dataKey] of Object.entries(CSS_SLOTS)) {
    const code = eq[slot]
    if (code) document.documentElement.dataset[dataKey] = code.split('.').pop()
    else delete document.documentElement.dataset[dataKey]
  }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(eq)) } catch {}
}

export function applyCachedSkins() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) applySkins(JSON.parse(cached))
  } catch {}
}

export function clearSkins() {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
  applySkins(null)
}
