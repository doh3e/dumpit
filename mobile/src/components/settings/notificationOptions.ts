/** 웹 SettingsModal.jsx THRESHOLDS 미러 — 서버 ALLOWED_THRESHOLDS와 일치 */
export const NOTIFICATION_THRESHOLDS = [
  { min: 720, label: '12시간 전' },
  { min: 360, label: '6시간 전' },
  { min: 180, label: '3시간 전' },
  { min: 60, label: '1시간 전' },
  { min: 30, label: '30분 전' },
  { min: 10, label: '10분 전' },
] as const;

export function toggleThreshold(selected: number[], min: number): number[] {
  return selected.includes(min) ? selected.filter((t) => t !== min) : [...selected, min];
}
