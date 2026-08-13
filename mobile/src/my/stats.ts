/** 웹 MyPage.jsx 통계 파생 이식 — 서버 StatsResponse를 표시용으로 가공하는 순수 함수들 */

// 웹 formatFocusTotal 이식
export function formatFocusTotal(minutes: number): string {
  const m = Number(minutes) || 0;
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h}시간 ${rest}분` : `${h}시간`;
}

export type HeatCell = { date: string; count: number; isToday: boolean };

/** 서버 히트맵(삽입 순서 = 날짜 순)을 7일씩 주 열로 — 웹 HeatmapGrid 이식 */
export function heatmapWeeks(heatmap: Record<string, number>, todayKey: string): HeatCell[][] {
  const cells: HeatCell[] = Object.entries(heatmap).map(([date, count]) => ({
    date, count, isToday: date === todayKey,
  }));
  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function heatLevel(count: number): 0 | 1 | 2 | 3 {
  if (count >= 3) return 3;
  if (count === 2) return 2;
  if (count === 1) return 1;
  return 0;
}

// 웹 MyPage CATEGORY_COLOR 이식 (차트 전용 하드코딩 — index.css .cat-* 계열 뮤트 휴)
const CATEGORY_COLOR: Record<string, string> = {
  WORK: '#5B84AE', STUDY: '#7A6FC0', APPOINTMENT: '#C4708F',
  CHORE: '#D49E35', ROUTINE: '#9A6FB8', HEALTH: '#6E9E62',
  HOBBY: '#C07862', OTHER: '#8A8578',
};

export type CategoryBar = { category: string; count: number; ratio: number; color: string };

export function categoryBars(breakdown: Record<string, number>): CategoryBar[] {
  const entries = Object.entries(breakdown).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return [];
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category, count, ratio: count / total,
      color: CATEGORY_COLOR[category] ?? CATEGORY_COLOR.OTHER,
    }));
}
