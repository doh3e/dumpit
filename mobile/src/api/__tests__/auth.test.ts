import { AxiosError, type AxiosResponse } from 'axios';
import { fetchMe, isWithdrawalPendingError, loginWithGoogleIdToken, loginWithRestoreConfirm } from '../auth';
import { api } from '../client';

jest.mock('../client', () => ({
  api: { post: jest.fn(), get: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('auth api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loginWithGoogleIdToken은 idToken을 POST하고 me를 반환한다', async () => {
    mockedApi.post.mockResolvedValue({ data: { email: 'stale@b.c', nickname: '유저', picture: null } });
    mockedApi.get.mockResolvedValue({
      data: { email: 'a@b.c', name: '유저', picture: null, coins: 0, isAdmin: false },
    });

    const me = await loginWithGoogleIdToken('tok', { allowRestore: true });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/mobile/google', { idToken: 'tok', allowRestore: true });
    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me', undefined);
    expect(me.email).toBe('a@b.c');
  });

  it('자동 재로그인은 탈퇴 철회를 요청하지 않는다', async () => {
    mockedApi.post.mockResolvedValue({ data: { restored: false } });
    mockedApi.get.mockResolvedValue({
      data: { email: 'a@b.c', name: '유저', picture: null, coins: 0, isAdmin: false },
    });

    await loginWithGoogleIdToken('tok', { allowRestore: false });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/mobile/google', { idToken: 'tok', allowRestore: false });
  });

  it('fetchMe는 /auth/me를 조회한다', async () => {
    mockedApi.get.mockResolvedValue({
      data: { email: 'a@b.c', name: '유저', picture: null, coins: 3, isAdmin: false },
    });
    const me = await fetchMe();
    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me', undefined);
    expect(me.coins).toBe(3);
  });
});

/** 서버 GlobalExceptionHandler의 409 WITHDRAWAL_PENDING 응답 모양 그대로 */
function withdrawalPendingError(): AxiosError {
  return new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: {},
    data: { code: 'WITHDRAWAL_PENDING', error: '탈퇴 처리가 진행 중인 계정입니다.' },
  } as AxiosResponse);
}

describe('loginWithRestoreConfirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({
      data: { email: 'a@b.c', name: '유저', picture: null, coins: 0, isAdmin: false },
    });
  });

  it('유예 중이 아니면 복구 의사 없이(allowRestore=false) 곧장 로그인한다', async () => {
    mockedApi.post.mockResolvedValue({ data: { restored: false } });
    const confirm = jest.fn();

    const login = await loginWithRestoreConfirm('tok', confirm);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/mobile/google', { idToken: 'tok', allowRestore: false });
    expect(confirm).not.toHaveBeenCalled();
    expect(login?.email).toBe('a@b.c');
  });

  it('유예 중 신호(409)를 받으면 복구 의사를 묻고, 동의하면 allowRestore=true로 재시도한다', async () => {
    mockedApi.post
      .mockRejectedValueOnce(withdrawalPendingError())
      .mockResolvedValueOnce({ data: { restored: true } });
    const confirm = jest.fn().mockResolvedValue(true);

    const login = await loginWithRestoreConfirm('tok', confirm);

    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/auth/mobile/google', { idToken: 'tok', allowRestore: false });
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/auth/mobile/google', { idToken: 'tok', allowRestore: true });
    expect(login?.restored).toBe(true);
  });

  it('복구를 거절하면 재시도 없이 로그인하지 않는다', async () => {
    mockedApi.post.mockRejectedValueOnce(withdrawalPendingError());
    const confirm = jest.fn().mockResolvedValue(false);

    const login = await loginWithRestoreConfirm('tok', confirm);

    expect(login).toBeNull();
    expect(mockedApi.post).toHaveBeenCalledTimes(1);
  });

  it('유예 신호가 아닌 실패는 복구를 묻지 않고 그대로 던진다', async () => {
    const serverError = new AxiosError('Server', 'ERR_BAD_RESPONSE', undefined, undefined, {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {},
      data: {},
    } as AxiosResponse);
    mockedApi.post.mockRejectedValueOnce(serverError);
    const confirm = jest.fn();

    await expect(loginWithRestoreConfirm('tok', confirm)).rejects.toBe(serverError);
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe('isWithdrawalPendingError', () => {
  it('409 + WITHDRAWAL_PENDING 코드만 유예 신호로 본다', () => {
    expect(isWithdrawalPendingError(withdrawalPendingError())).toBe(true);
    expect(isWithdrawalPendingError(new Error('plain'))).toBe(false);
    expect(
      isWithdrawalPendingError(
        new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config: {},
          data: { code: 'ACCOUNT_INACTIVE' },
        } as AxiosResponse),
      ),
    ).toBe(false);
  });
});
