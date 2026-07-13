/**
 * 백엔드 날짜 파싱 — ISO 문자열 또는 Jackson 배열 [year, month(1-based), day, h, m, s]
 */
export function parseDate(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    return new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDeadline(value) {
  const date = parseDate(value)
  if (!date) return null
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatTime(value) {
  const date = parseDate(value)
  if (!date) return null
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function isSameLocalDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function isToday(value) {
  const date = parseDate(value)
  return date != null && isSameLocalDate(date, new Date())
}
