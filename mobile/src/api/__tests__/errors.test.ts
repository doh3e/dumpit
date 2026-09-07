import {
  AppError,
  DEFAULT_ERROR_MESSAGE,
  GoogleSignInError,
  describeError,
  withErrorCode,
} from '../errors';

const axiosErr = (status: number | undefined, data?: unknown, code?: string) =>
  ({ isAxiosError: true, code, response: status ? { status, data } : undefined }) as never;

describe('describeError — 구글 로그인 단계(GoogleSignInError)', () => {
  it('취소(12501)는 silent, 문구 없음', () => {
    const info = describeError(new GoogleSignInError('12501', 'cancelled'));
    expect(info.silent).toBe(true);
    expect(info.code).toBe('GSI-12501');
    expect(info.tagged).toBe(false);
  });
  it('10(DEVELOPER_ERROR)은 앱 설정 문제 안내 + 캡처 요청', () => {
    const info = describeError(new GoogleSignInError('10', 'DEVELOPER_ERROR'));
    expect(info.message).toBe(
      '앱 설정 문제로 로그인할 수 없어요. 이 화면을 캡처해 dumpitadmin@gmail.com으로 보내주세요.',
    );
    expect(info.code).toBe('GSI-10');
    expect(info.tagged).toBe(true);
    expect(info.silent).toBe(false);
  });
  it('7(NETWORK_ERROR)은 인터넷 확인 안내', () => {
    expect(describeError(new GoogleSignInError('7', 'x')).message).toBe('인터넷 연결을 확인한 뒤 다시 시도해주세요.');
  });
  it('PLAY_SERVICES_NOT_AVAILABLE은 Play 스토어 업데이트 안내', () => {
    const info = describeError(new GoogleSignInError('PLAY_SERVICES_NOT_AVAILABLE', 'x'));
    expect(info.message).toBe('Google Play 서비스를 사용할 수 없어요. Play 스토어에서 업데이트한 뒤 다시 시도해주세요.');
    expect(info.code).toBe('GSI-PLAY_SERVICES_NOT_AVAILABLE');
  });
  it('ASYNC_OP_IN_PROGRESS는 진행 중 안내', () => {
    expect(describeError(new GoogleSignInError('ASYNC_OP_IN_PROGRESS', 'x')).message).toBe(
      '이미 로그인이 진행 중이에요. 잠시만 기다려주세요.',
    );
  });
  it('모르는 코드는 일반 구글 로그인 실패 문구 + 코드 유지', () => {
    const info = describeError(new GoogleSignInError('8', 'INTERNAL'));
    expect(info.message).toBe('구글 로그인에 실패했어요. 다시 시도해주세요.');
    expect(info.code).toBe('GSI-8');
  });
});

describe('describeError — 서버 응답 있음', () => {
  it('서버 문구가 있는 4xx는 문구 그대로, 태그 없음, 코드에 서버 code 포함', () => {
    const info = describeError(axiosErr(400, { error: '잘못된 요청', code: 'BAD_REQUEST' }));
    expect(info).toEqual({ message: '잘못된 요청', code: 'HTTP-400/BAD_REQUEST', tagged: false, silent: false });
  });
  it('서버 code가 없으면 HTTP-상태만', () => {
    expect(describeError(axiosErr(400, { error: '잘못된 요청' })).code).toBe('HTTP-400');
  });
  it('error가 공백이면 message 필드로 폴백', () => {
    expect(describeError(axiosErr(400, { error: '  ', message: '메시지' })).message).toBe('메시지');
  });
  it('서버 문구가 있어도 5xx는 태그한다', () => {
    const info = describeError(axiosErr(500, { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_SERVER_ERROR' }));
    expect(info.tagged).toBe(true);
    expect(info.code).toBe('HTTP-500/INTERNAL_SERVER_ERROR');
  });
  it('문구 없는 401/403/404는 기본 안내 + 태그', () => {
    expect(describeError(axiosErr(401))).toEqual({ message: '로그인이 필요합니다.', code: 'HTTP-401', tagged: true, silent: false });
    expect(describeError(axiosErr(403)).message).toBe('접근 권한이 없습니다.');
    expect(describeError(axiosErr(404)).message).toBe('요청한 대상을 찾을 수 없습니다.');
  });
  it('429는 사용량 소진 문구, 태그 없음', () => {
    expect(describeError(axiosErr(429))).toEqual({ message: '사용 가능 횟수를 모두 사용했어요.', code: 'HTTP-429', tagged: false, silent: false });
  });
  it('문구 없는 5xx는 서버 오류 문구 + 태그', () => {
    expect(describeError(axiosErr(503))).toEqual({
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code: 'HTTP-503', tagged: true, silent: false,
    });
  });
  it('문구 없는 그 외 4xx는 fallback + 태그', () => {
    expect(describeError(axiosErr(418), '기본')).toEqual({ message: '기본', code: 'HTTP-418', tagged: true, silent: false });
  });
});

describe('describeError — 응답 없음·앱 예외', () => {
  it('네트워크 오류는 NET-코드 + 연결 확인 문구', () => {
    expect(describeError(axiosErr(undefined, undefined, 'ERR_NETWORK'))).toEqual({
      message: '서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.', code: 'NET-ERR_NETWORK', tagged: true, silent: false,
    });
  });
  it('타임아웃은 NET-ECONNABORTED', () => {
    expect(describeError(axiosErr(undefined, undefined, 'ECONNABORTED')).code).toBe('NET-ECONNABORTED');
  });
  it('axios code가 없으면 NET-UNKNOWN', () => {
    expect(describeError(axiosErr(undefined)).code).toBe('NET-UNKNOWN');
  });
  it('AppError는 자기 문구 + APP-코드', () => {
    expect(describeError(new AppError('NO_ID_TOKEN', '토큰 없음'))).toEqual({
      message: '토큰 없음', code: 'APP-NO_ID_TOKEN', tagged: true, silent: false,
    });
  });
  it('정체불명 예외는 fallback + APP-UNKNOWN', () => {
    expect(describeError(new Error('boom'), '기본')).toEqual({ message: '기본', code: 'APP-UNKNOWN', tagged: true, silent: false });
    expect(describeError(undefined).message).toBe(DEFAULT_ERROR_MESSAGE);
  });
});

describe('withErrorCode', () => {
  it('코드가 있으면 대괄호로 붙인다', () => {
    expect(withErrorCode('실패', 'HTTP-500')).toBe('실패 [HTTP-500]');
  });
  it('코드가 없으면 문구 그대로', () => {
    expect(withErrorCode('실패', null)).toBe('실패');
  });
});
