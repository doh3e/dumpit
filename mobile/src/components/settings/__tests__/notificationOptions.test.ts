import { NOTIFICATION_THRESHOLDS, toggleThreshold } from '../notificationOptions';

describe('알림 임계값 선택지', () => {
  it('웹과 같은 세트를 노출한다', () => {
    expect(NOTIFICATION_THRESHOLDS.map((t) => t.min)).toEqual([720, 360, 180, 60, 30, 10]);
  });
  it('토글은 추가·제거를 오간다', () => {
    expect(toggleThreshold([60], 30)).toEqual([60, 30]);
    expect(toggleThreshold([60, 30], 30)).toEqual([60]);
  });
});
