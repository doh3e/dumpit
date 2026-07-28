import { routeForLink } from '../links';

describe('routeForLink', () => {
  it('서버 link 문자열을 라우트로 바꾼다', () => {
    expect(routeForLink('home')).toBe('/(tabs)');
    expect(routeForLink('notices')).toBe('/notices');
  });
  it('모르는 값·없음은 null', () => {
    expect(routeForLink('whatever')).toBeNull();
    expect(routeForLink(undefined)).toBeNull();
  });
});
