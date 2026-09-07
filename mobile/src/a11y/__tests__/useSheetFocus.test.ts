import { openEdge } from '../useSheetFocus';

describe('openEdge', () => {
  it('닫힘→열림만 open, 열림 중 스냅 변경은 무시', () => {
    expect(openEdge(false, 0)).toBe('open');
    expect(openEdge(true, 1)).toBeNull();
    expect(openEdge(true, -1)).toBe('close');
    expect(openEdge(false, -1)).toBeNull();
  });
});
