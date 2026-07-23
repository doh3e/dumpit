import { loginWithGoogleIdToken, fetchMe } from '../auth';
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

    const me = await loginWithGoogleIdToken('tok');

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/mobile/google', { idToken: 'tok' });
    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me', undefined);
    expect(me.email).toBe('a@b.c');
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
