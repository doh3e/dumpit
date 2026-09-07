import axios from 'axios';

/** 앱이 스스로 던지는 예외 — 화면에는 `APP-<code>`로 노출된다 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 구글 로그인 네이티브 단계 예외. AuthContext가 라이브러리 에러(code 문자열)를 이 타입으로 감싼다 —
 * 이 모듈은 네이티브 모듈을 import하지 않아야 jest에서 그대로 돌아간다.
 */
export class GoogleSignInError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GoogleSignInError';
  }
}

export type ErrorInfo = {
  message: string;
  /** 진단 코드(GSI-/HTTP-/NET-/APP-). 캡처해 보내면 원인을 특정할 수 있다 */
  code: string | null;
  /** 일반 실패 문구(토스트 등)에 코드 태그를 붙일지 — 예상 밖 실패에만 true */
  tagged: boolean;
  /** 사용자가 스스로 취소한 경우 — 아무것도 보여주지 않는다 */
  silent: boolean;
};

export const DEFAULT_ERROR_MESSAGE = '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.';

// 안드로이드 GoogleSignInStatusCodes/CommonStatusCodes를 문자열로 받는다.
// 라이브러리 statusCodes 상수는 네이티브 모듈 getConstants()라 여기서 못 쓴다.
const GSI_CANCELLED = '12501';
const GSI_MESSAGES: Record<string, string> = {
  '10': '앱 설정 문제로 로그인할 수 없어요. 이 화면을 캡처해 dumpitadmin@gmail.com으로 보내주세요.',
  '7': '인터넷 연결을 확인한 뒤 다시 시도해주세요.',
  ASYNC_OP_IN_PROGRESS: '이미 로그인이 진행 중이에요. 잠시만 기다려주세요.',
  PLAY_SERVICES_NOT_AVAILABLE:
    'Google Play 서비스를 사용할 수 없어요. Play 스토어에서 업데이트한 뒤 다시 시도해주세요.',
};
const GSI_FALLBACK = '구글 로그인에 실패했어요. 다시 시도해주세요.';

function nonBlank(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function describeError(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): ErrorInfo {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (!status) {
      return {
        message: '서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.',
        code: `NET-${error.code ?? 'UNKNOWN'}`,
        tagged: true,
        silent: false,
      };
    }
    const data = error.response?.data as { error?: unknown; message?: unknown; code?: unknown } | undefined;
    const serverCode = nonBlank(data?.code);
    const code = serverCode ? `HTTP-${status}/${serverCode}` : `HTTP-${status}`;
    const serverMessage = nonBlank(data?.error) ?? nonBlank(data?.message);
    // 서버가 한국어 안내를 보낸 4xx는 사용자가 스스로 고칠 수 있는 오류 — 태그로 어지럽히지 않는다
    if (serverMessage) return { message: serverMessage, code, tagged: status >= 500, silent: false };
    if (status === 401) return { message: '로그인이 필요합니다.', code, tagged: true, silent: false };
    if (status === 403) return { message: '접근 권한이 없습니다.', code, tagged: true, silent: false };
    if (status === 404) return { message: '요청한 대상을 찾을 수 없습니다.', code, tagged: true, silent: false };
    if (status === 429) return { message: '사용 가능 횟수를 모두 사용했어요.', code, tagged: false, silent: false };
    if (status >= 500) {
      return { message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code, tagged: true, silent: false };
    }
    return { message: fallback, code, tagged: true, silent: false };
  }
  if (error instanceof GoogleSignInError) {
    if (error.code === GSI_CANCELLED) return { message: '', code: `GSI-${error.code}`, tagged: false, silent: true };
    return { message: GSI_MESSAGES[error.code] ?? GSI_FALLBACK, code: `GSI-${error.code}`, tagged: true, silent: false };
  }
  if (error instanceof AppError) {
    return { message: error.message, code: `APP-${error.code}`, tagged: true, silent: false };
  }
  return { message: fallback, code: 'APP-UNKNOWN', tagged: true, silent: false };
}

export function withErrorCode(message: string, code: string | null): string {
  return code ? `${message} [${code}]` : message;
}
