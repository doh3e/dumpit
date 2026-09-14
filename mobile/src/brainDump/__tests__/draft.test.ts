import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearDraft,
  pruneExpiredDrafts,
  readDraft,
  writeDraft,
} from '../draft';

const PREFIX = 'dumpit:brain-dump-draft:v1:';
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 2_000_000_000_000;
const setItemMock = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
const removeItemMock = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;
const getAllKeysMock = AsyncStorage.getAllKeys as jest.MockedFunction<typeof AsyncStorage.getAllKeys>;
const baseSetItem = setItemMock.getMockImplementation()!;
const baseRemoveItem = removeItemMock.getMockImplementation()!;
const baseGetAllKeys = getAllKeysMock.getMockImplementation()!;

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  jest.restoreAllMocks();
  setItemMock.mockImplementation(baseSetItem);
  removeItemMock.mockImplementation(baseRemoveItem);
  getAllKeysMock.mockImplementation(baseGetAllKeys);
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('brainDump draft 저장소', () => {
  it('email을 그대로 인코딩해 계정을 분리하고 원문 공백을 보존한다', async () => {
    const accountA = ' Alice+draft@example.com ';
    const accountB = 'alice+draft@example.com';

    await expect(writeDraft(accountA, '  첫 줄\n둘째 줄  ', NOW)).resolves.toEqual({
      version: 1,
      rawText: '  첫 줄\n둘째 줄  ',
      updatedAt: NOW,
    });
    await writeDraft(accountB, 'B 초안', NOW);

    await expect(AsyncStorage.getItem(`${PREFIX}%20Alice%2Bdraft%40example.com%20`)).resolves.toBe(
      JSON.stringify({ version: 1, rawText: '  첫 줄\n둘째 줄  ', updatedAt: NOW }),
    );
    await expect(readDraft(accountA, NOW)).resolves.toEqual({
      version: 1,
      rawText: '  첫 줄\n둘째 줄  ',
      updatedAt: NOW,
    });
    await expect(readDraft(accountB, NOW)).resolves.toEqual({
      version: 1,
      rawText: 'B 초안',
      updatedAt: NOW,
    });
  });

  it.each([undefined, null, '', '   ', '\n\t', 42])(
    '비로그인 또는 잘못된 accountKey %p를 거부한다',
    async (accountKey) => {
      await expect(readDraft(accountKey as string, NOW)).rejects.toThrow();
      await expect(writeDraft(accountKey as string, '초안', NOW)).rejects.toThrow();
      await expect(clearDraft(accountKey as string)).rejects.toThrow();
    },
  );

  it.each([NaN, Infinity, -1, '1', null])('잘못된 now %p를 거부한다', async (now) => {
    await expect(readDraft('a@example.com', now as number)).rejects.toThrow();
    await expect(writeDraft('a@example.com', '초안', now as number)).rejects.toThrow();
    await expect(pruneExpiredDrafts(now as number)).rejects.toThrow();
  });

  it('빈 문자열만 현재 계정 초안을 지우고 공백 원문은 저장한다', async () => {
    await writeDraft('a@example.com', 'A', NOW);
    await writeDraft('b@example.com', 'B', NOW);

    await expect(writeDraft('a@example.com', '', NOW)).resolves.toBeNull();
    await expect(readDraft('a@example.com', NOW)).resolves.toBeNull();
    await expect(readDraft('b@example.com', NOW)).resolves.toMatchObject({ rawText: 'B' });
    await expect(writeDraft('a@example.com', ' \n ', NOW)).resolves.toMatchObject({ rawText: ' \n ' });
  });

  it('3000자를 저장하고 초과 길이와 문자열이 아닌 원문은 거부한다', async () => {
    await expect(writeDraft('a@example.com', '가'.repeat(3000), NOW)).resolves.toMatchObject({
      rawText: '가'.repeat(3000),
    });
    await expect(writeDraft('a@example.com', '가'.repeat(3001), NOW)).rejects.toThrow();
    await expect(writeDraft('a@example.com', null as unknown as string, NOW)).rejects.toThrow();
  });

  it.each([
    ['깨진 JSON', '{깨짐'],
    ['구버전', JSON.stringify({ version: 0, rawText: '초안', updatedAt: NOW })],
    ['추가 필드', JSON.stringify({ version: 1, rawText: '초안', updatedAt: NOW, dumpId: 'secret' })],
    ['초과 원문', JSON.stringify({ version: 1, rawText: '가'.repeat(3001), updatedAt: NOW })],
    ['잘못된 시각', JSON.stringify({ version: 1, rawText: '초안', updatedAt: -1 })],
    ['미래 시각', JSON.stringify({ version: 1, rawText: '초안', updatedAt: NOW + 1 })],
    ['7일 만료', JSON.stringify({ version: 1, rawText: '초안', updatedAt: NOW - 7 * DAY_MS })],
  ])('%s 데이터는 해당 키만 정리하고 null을 반환한다', async (_label, raw) => {
    const key = `${PREFIX}a%40example.com`;
    await AsyncStorage.setItem(key, raw);
    await AsyncStorage.setItem('unrelated', 'preserve');

    await expect(readDraft('a@example.com', NOW)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
    await expect(AsyncStorage.getItem('unrelated')).resolves.toBe('preserve');
  });

  it('만료 직전의 정확한 구조는 보존한다', async () => {
    const draft = { version: 1, rawText: '유효', updatedAt: NOW - 7 * DAY_MS + 1 };
    await AsyncStorage.setItem(`${PREFIX}a%40example.com`, JSON.stringify(draft));

    await expect(readDraft('a@example.com', NOW)).resolves.toEqual(draft);
  });

  it('시작 정리는 prefix의 손상·만료·잘못 인코딩된 키만 제거한다', async () => {
    const validKey = `${PREFIX}valid%40example.com`;
    const expiredKey = `${PREFIX}expired%40example.com`;
    const malformedAccountKey = `${PREFIX}%E0%A4%A`;
    const extraFieldKey = `${PREFIX}extra%40example.com`;
    await AsyncStorage.multiSet([
      [validKey, JSON.stringify({ version: 1, rawText: '보존', updatedAt: NOW })],
      [expiredKey, JSON.stringify({ version: 1, rawText: '만료', updatedAt: NOW - 7 * DAY_MS })],
      [malformedAccountKey, JSON.stringify({ version: 1, rawText: '손상', updatedAt: NOW })],
      [extraFieldKey, JSON.stringify({ version: 1, rawText: '손상', updatedAt: NOW, result: [] })],
      ['other:feature', '그대로'],
    ]);

    await pruneExpiredDrafts(NOW);

    await expect(AsyncStorage.getItem(validKey)).resolves.not.toBeNull();
    await expect(AsyncStorage.getItem(expiredKey)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(malformedAccountKey)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(extraFieldKey)).resolves.toBeNull();
    await expect(AsyncStorage.getItem('other:feature')).resolves.toBe('그대로');
  });

  it('지연된 write 뒤 clear를 직렬화해 삭제한 초안이 되살아나지 않는다', async () => {
    const writeGate = deferred();
    setItemMock.mockImplementationOnce(async (key, value) => {
      await writeGate.promise;
      await baseSetItem(key, value);
    });

    const write = writeDraft('a@example.com', '늦은 초안', NOW);
    const clear = clearDraft('a@example.com');
    let clearSettled = false;
    void clear.finally(() => { clearSettled = true; });
    await Promise.resolve();

    expect(clearSettled).toBe(false);
    writeGate.resolve();
    await Promise.all([write, clear]);
    await expect(readDraft('a@example.com', NOW)).resolves.toBeNull();
  });

  it('read도 지연된 write와 같은 계정 경계를 사용해 최신 값을 읽는다', async () => {
    const writeGate = deferred();
    setItemMock.mockImplementationOnce(async (key, value) => {
      await writeGate.promise;
      await baseSetItem(key, value);
    });

    const write = writeDraft('a@example.com', '최신', NOW);
    const read = readDraft('a@example.com', NOW);
    writeGate.resolve();

    await write;
    await expect(read).resolves.toMatchObject({ rawText: '최신' });
  });

  it('한 계정의 지연된 write가 다른 계정 작업을 막지 않는다', async () => {
    const writeGate = deferred();
    setItemMock.mockImplementationOnce(async (key, value) => {
      await writeGate.promise;
      await baseSetItem(key, value);
    });

    const accountAWrite = writeDraft('a@example.com', 'A', NOW);
    await expect(writeDraft('b@example.com', 'B', NOW)).resolves.toMatchObject({ rawText: 'B' });
    await expect(readDraft('b@example.com', NOW)).resolves.toMatchObject({ rawText: 'B' });

    writeGate.resolve();
    await accountAWrite;
  });

  it('실패한 요청 뒤에도 같은 계정 queue가 막히지 않는다', async () => {
    setItemMock.mockRejectedValueOnce(new Error('quota'));

    await expect(writeDraft('a@example.com', '실패', NOW)).rejects.toThrow();
    await expect(writeDraft('a@example.com', '복구', NOW)).resolves.toMatchObject({ rawText: '복구' });
    await expect(readDraft('a@example.com', NOW)).resolves.toMatchObject({ rawText: '복구' });
  });

  it('default prune는 지연된 키 조회 뒤 각 직렬 검사 시각으로 최신 write를 판정한다', async () => {
    const account = 'a@example.com';
    const key = `${PREFIX}a%40example.com`;
    await writeDraft(account, '이전', 900);
    const keySnapshot = await baseGetAllKeys();
    const keysGate = deferred();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    getAllKeysMock.mockImplementation(async () => {
      await keysGate.promise;
      return keySnapshot;
    });

    const pruning = pruneExpiredDrafts();
    await Promise.resolve();
    jest.spyOn(Date, 'now').mockReturnValue(2_000);
    await writeDraft(account, '키 조회 중 저장', 2_000);
    keysGate.resolve();
    await pruning;

    await expect(AsyncStorage.getItem(key)).resolves.toBe(
      JSON.stringify({ version: 1, rawText: '키 조회 중 저장', updatedAt: 2_000 }),
    );
  });

  it('명시한 prune 시각은 지연된 목록 조회 뒤에도 고정한다', async () => {
    const key = `${PREFIX}a%40example.com`;
    await writeDraft('a@example.com', '호출자 기준 미래', 1_500);
    const keySnapshot = await baseGetAllKeys();
    const keysGate = deferred();
    getAllKeysMock.mockImplementation(async () => {
      await keysGate.promise;
      return keySnapshot;
    });

    const pruning = pruneExpiredDrafts(1_000);
    jest.spyOn(Date, 'now').mockReturnValue(2_000);
    keysGate.resolve();
    await pruning;

    await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
  });

  it('손상 데이터 삭제·저장소 접근 오류를 숨기지 않고 queue는 복구한다', async () => {
    const key = `${PREFIX}a%40example.com`;
    await AsyncStorage.setItem(key, '{민감한 JSON');
    removeItemMock.mockRejectedValueOnce(new Error('denied'));

    await expect(readDraft('a@example.com', NOW)).rejects.toThrow();
    await expect(AsyncStorage.getItem(key)).resolves.toBe('{민감한 JSON');

    await expect(clearDraft('a@example.com')).resolves.toBeUndefined();
    await expect(readDraft('a@example.com', NOW)).resolves.toBeNull();
  });

  it('발생시킨 오류 메시지에 계정·원문·저장 JSON을 노출하지 않는다', async () => {
    const account = 'private@example.com';
    const rawText = '비밀 원문';
    const storedJson = JSON.stringify({ version: 1, rawText, updatedAt: NOW });
    setItemMock.mockRejectedValueOnce(new Error(`denied ${account} ${rawText} ${storedJson}`));

    let error: Error | undefined;
    try {
      await writeDraft(account, rawText, NOW);
    } catch (caught) {
      if (caught instanceof Error) error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error!.message).not.toContain(account);
    expect(error!.message).not.toContain(rawText);
    expect(error!.message).not.toContain('rawText');
    expect(error!.cause).toBeUndefined();
    expect(JSON.stringify(error)).not.toContain(account);
    expect(JSON.stringify(error)).not.toContain(rawText);
  });
});
