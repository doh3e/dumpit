import { api, getApiErrorMessage } from '../client';

describe('api client', () => {
  it('세션 쿠키와 CSRF 대체 헤더를 기본 장착한다', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.headers['X-Requested-With']).toBe('XMLHttpRequest');
  });
});

describe('getApiErrorMessage', () => {
  const axiosErr = (status: number, data?: unknown) =>
    ({ isAxiosError: true, response: { status, data } }) as never;

  it('서버 error 필드를 우선한다', () => {
    expect(getApiErrorMessage(axiosErr(400, { error: '잘못된 요청' }))).toBe('잘못된 요청');
  });
  it('401은 로그인 안내', () => {
    expect(getApiErrorMessage(axiosErr(401))).toBe('로그인이 필요합니다.');
  });
  it('알 수 없는 에러는 fallback', () => {
    expect(getApiErrorMessage(new Error('boom'), '기본')).toBe('기본');
  });
});
