// 서버가 원본, localStorage는 첫 페인트 번쩍임 방지용 캐시
const CACHE_KEY = 'dumpit_equipments'
// CSS로 적용되는 슬롯만 dataset에 반영 (스프라이트 슬롯은 컴포넌트가 user.equipments에서 직접 읽음)
const CSS_SLOTS = { BACKGROUND: 'skinBg', CHROME: 'skinChrome', POMODORO: 'skinPomodoro' }

function setDataset(eq) {
  for (const [slot, dataKey] of Object.entries(CSS_SLOTS)) {
    const code = eq[slot]
    if (code) document.documentElement.dataset[dataKey] = code.split('.').pop()
    else delete document.documentElement.dataset[dataKey]
  }
}

export function applySkins(equipments) {
  const eq = equipments || {}
  setDataset(eq)
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(eq)) } catch {}
}

// 상점 미리보기용 — dataset만 바꾸고 캐시는 건드리지 않는다 (새로고침·이탈 시 실제 장착으로 복원)
export function applySkinsTransient(equipments) {
  setDataset(equipments || {})
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
