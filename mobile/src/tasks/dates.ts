/** 백엔드 날짜 파싱 — ISO 문자열(오프셋 없는 KST 벽시계, 기기 로컬로 해석. 웹 dates.js 이식) */
export function parseDate(value: string | number[] | null | undefined): Date | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    // Jackson 배열 폴백 [year, month(1-based), day, h, m, s]
    return new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 웹 toLocaleString('ko-KR') 출력 재현 — "7월 24일 오후 06:00". Hermes Intl 의존 없이 수동 조립 */
export function formatDeadline(value: string | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;
  const h = date.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${ampm} ${pad2(h12)}:${pad2(date.getMinutes())}`;
}

export function formatTime(value: string | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function isSameLocalDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function isToday(value: string | null | undefined): boolean {
  const date = parseDate(value);
  return date != null && isSameLocalDate(date, new Date());
}

/** 서버 전송용 "YYYY-MM-DDTHH:mm" — 로컬 필드 기반 (toISOString UTC 변환 금지) */
export function toLocalDateTimeString(d: Date): string {
  return `${toLocalDateString(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "YYYY-MM-DD" */
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
