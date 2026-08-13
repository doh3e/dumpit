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
  it('403은 접근 권한 문구', () => {
    expect(getApiErrorMessage(axiosErr(403))).toBe('접근 권한이 없습니다.');
  });
  it('404는 대상 없음 문구', () => {
    expect(getApiErrorMessage(axiosErr(404))).toBe('요청한 대상을 찾을 수 없습니다.');
  });
  it('429는 사용량 소진 문구', () => {
    expect(getApiErrorMessage(axiosErr(429))).toBe('사용 가능 횟수를 모두 사용했어요.');
  });
  it('500대는 서버 오류 문구', () => {
    expect(getApiErrorMessage(axiosErr(503))).toBe('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });
  it('error가 공백 문자열이면 message 필드로 폴백', () => {
    expect(getApiErrorMessage(axiosErr(400, { error: '  ', message: '메시지' }))).toBe('메시지');
  });
  it('알 수 없는 에러는 fallback', () => {
    expect(getApiErrorMessage(new Error('boom'), '기본')).toBe('기본');
  });
});
