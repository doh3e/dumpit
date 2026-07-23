import { parseDate } from './dates';

export function buildMonthCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  return cells;
}

export function bucketByDay<T>(
  items: T[],
  getDate: (x: T) => string | null,
  year: number,
  month: number,
): Map<number, T[]> {
  const buckets = new Map<number, T[]>();

  items.forEach((item) => {
    const date = parseDate(getDate(item));
    if (!date || date.getFullYear() !== year || date.getMonth() !== month) return;

    const day = date.getDate();
    const bucket = buckets.get(day);
    if (bucket) bucket.push(item);
    else buckets.set(day, [item]);
  });

  return buckets;
}
