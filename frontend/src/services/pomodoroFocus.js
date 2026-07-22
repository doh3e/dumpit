// 뽀모도로 집중 세션의 라이브 상태 — 집중 타이머가 도는 동안만 존재한다.
// 타이머 인스턴스(사이드바·모바일 팝업)가 여럿이라 owner 토큰으로 남의 상태를 지우지 않게 한다.
let focus = null // { taskId, title }
let owner = null
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener(focus))
}

export function getPomodoroFocus() {
  return focus
}

export function subscribePomodoroFocus(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setPomodoroFocus(token, next) {
  owner = token
  focus = next
  emit()
}

export function clearPomodoroFocus(token) {
  if (owner !== token) return
  owner = null
  focus = null
  emit()
}
