import axios from 'axios';
import { installSilentReauth } from '../reauth';

/** 응답 시퀀스를 주입한 axios 인스턴스 — 어댑터 교체로 네트워크 없이 검증 */
function makeInstance(responses: Array<{ status: number; data?: unknown }>) {
  let call = 0;
  const instance = axios.create();
  instance.defaults.adapter = async (config) => {
    const r = responses[Math.min(call++, responses.length - 1)];
    if (r.status >= 400) {
      const err: any = new Error(`HTTP ${r.status}`);
      err.config = config;
      err.response = { status: r.status, data: r.data };
      err.isAxiosError = true;
      throw err;
    }
    return { status: r.status, data: r.data, statusText: 'OK', headers: {}, config } as any;
  };
  return { instance, calls: () => call };
}

it('401이면 reauth 후 원요청을 1회 재시도한다', async () => {
  const { instance, calls } = makeInstance([{ status: 401 }, { status: 200, data: 'ok' }]);
  const reauth = jest.fn().mockResolvedValue(true);
  installSilentReauth(instance, reauth);
  const res = await instance.get('/dashboard/planning');
  expect(res.data).toBe('ok');
  expect(reauth).toHaveBeenCalledTimes(1);
  expect(calls()).toBe(2);
});

it('reauth 실패 시 원래 401을 그대로 던진다', async () => {
  const { instance } = makeInstance([{ status: 401 }]);
  installSilentReauth(instance, jest.fn().mockResolvedValue(false));
  await expect(instance.get('/x')).rejects.toMatchObject({ response: { status: 401 } });
});

it('재시도한 요청이 또 401이면 무한루프 없이 실패한다', async () => {
  const { instance, calls } = makeInstance([{ status: 401 }, { status: 401 }]);
  const reauth = jest.fn().mockResolvedValue(true);
  installSilentReauth(instance, reauth);
  await expect(instance.get('/x')).rejects.toMatchObject({ response: { status: 401 } });
  expect(calls()).toBe(2);           // 원요청 + 재시도 1회뿐
  expect(reauth).toHaveBeenCalledTimes(1);
});

it('401이 아닌 에러는 건드리지 않는다', async () => {
  const { instance, calls } = makeInstance([{ status: 500 }]);
  const reauth = jest.fn();
  installSilentReauth(instance, reauth);
  await expect(instance.get('/x')).rejects.toMatchObject({ response: { status: 500 } });
  expect(reauth).not.toHaveBeenCalled();
  expect(calls()).toBe(1);
});

it('로그인 엔드포인트 자체의 401은 건드리지 않는다', async () => {
  const { instance, calls } = makeInstance([{ status: 401 }]);
  const reauth = jest.fn();
  installSilentReauth(instance, reauth);
  await expect(instance.post('/auth/mobile/google', {})).rejects.toBeTruthy();
  expect(reauth).not.toHaveBeenCalled();
  expect(calls()).toBe(1);
});

it('동시 401 여러 건이면 reauth는 한 번만 돈다', async () => {
  const { instance } = makeInstance([
    { status: 401 }, { status: 401 }, { status: 200, data: 1 }, { status: 200, data: 2 },
  ]);
  let resolve!: (v: boolean) => void;
  const reauth = jest.fn(() => new Promise<boolean>((r) => { resolve = r; }));
  installSilentReauth(instance, reauth);
  const p1 = instance.get('/a');
  const p2 = instance.get('/b');
  await new Promise((r) => setTimeout(r, 0));
  resolve(true);
  await Promise.all([p1, p2]);
  expect(reauth).toHaveBeenCalledTimes(1);
});
