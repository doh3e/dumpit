import AsyncStorage from '@react-native-async-storage/async-storage';

export type BrainDumpDraft = {
  version: 1;
  rawText: string;
  updatedAt: number;
};

const DRAFT_KEY_PREFIX = 'dumpit:brain-dump-draft:v1:';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RAW_TEXT_LENGTH = 3000;
const STORAGE_ERROR_MESSAGE = '원문 초안 저장소에 접근하지 못했습니다.';
const DRAFT_FIELDS = ['version', 'rawText', 'updatedAt'];
const keyQueues = new Map<string, Promise<void>>();

function assertAccountKey(accountKey: string): string {
  if (typeof accountKey !== 'string' || accountKey.trim().length === 0) {
    throw new TypeError('유효한 계정 키가 필요합니다.');
  }
  return accountKey;
}

function assertNow(now: number): number {
  if (typeof now !== 'number' || !Number.isFinite(now) || now < 0) {
    throw new TypeError('유효한 검사 시각이 필요합니다.');
  }
  return now;
}

function assertRawText(rawText: string): string {
  if (typeof rawText !== 'string' || rawText.length > MAX_RAW_TEXT_LENGTH) {
    throw new TypeError('원문 초안은 3000자 이하 문자열이어야 합니다.');
  }
  return rawText;
}

function draftKey(accountKey: string): string {
  return `${DRAFT_KEY_PREFIX}${encodeURIComponent(assertAccountKey(accountKey))}`;
}

function storageFailure(): Error {
  return new Error(STORAGE_ERROR_MESSAGE);
}

async function getItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    throw storageFailure();
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    throw storageFailure();
  }
}

async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    throw storageFailure();
  }
}

async function getAllKeys(): Promise<readonly string[]> {
  try {
    return await AsyncStorage.getAllKeys();
  } catch {
    throw storageFailure();
  }
}

async function runSerialized<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = keyQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const turn = new Promise<void>((resolve) => {
    release = resolve;
  });
  keyQueues.set(key, turn);

  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (keyQueues.get(key) === turn) keyQueues.delete(key);
  }
}

function isCanonicalDraftKey(key: string): boolean {
  const encodedAccount = key.slice(DRAFT_KEY_PREFIX.length);
  if (encodedAccount.length === 0) return false;

  try {
    const accountKey = decodeURIComponent(encodedAccount);
    assertAccountKey(accountKey);
    return draftKey(accountKey) === key;
  } catch {
    return false;
  }
}

function parseDraft(raw: string, now: number): BrainDumpDraft | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const fields = Object.keys(record);
  if (fields.length !== DRAFT_FIELDS.length || !DRAFT_FIELDS.every((field) => Object.hasOwn(record, field))) {
    return null;
  }
  if (record.version !== 1) return null;
  if (
    typeof record.rawText !== 'string'
    || record.rawText.length === 0
    || record.rawText.length > MAX_RAW_TEXT_LENGTH
  ) return null;
  if (
    typeof record.updatedAt !== 'number'
    || !Number.isFinite(record.updatedAt)
    || record.updatedAt < 0
  ) return null;
  if (record.updatedAt > now || now - record.updatedAt >= DRAFT_TTL_MS) return null;

  return record as BrainDumpDraft;
}

async function readKey(key: string, now: number): Promise<BrainDumpDraft | null> {
  const raw = await getItem(key);
  if (raw === null) return null;

  const draft = parseDraft(raw, now);
  if (draft !== null) return draft;

  await removeItem(key);
  return null;
}

export async function readDraft(
  accountKey: string,
  now: number = Date.now(),
): Promise<BrainDumpDraft | null> {
  const key = draftKey(accountKey);
  const checkedAt = assertNow(now);
  return runSerialized(key, () => readKey(key, checkedAt));
}

export async function writeDraft(
  accountKey: string,
  rawText: string,
  now: number = Date.now(),
): Promise<BrainDumpDraft | null> {
  const key = draftKey(accountKey);
  assertRawText(rawText);
  assertNow(now);

  return runSerialized(key, async () => {
    if (rawText === '') {
      await removeItem(key);
      return null;
    }

    const draft: BrainDumpDraft = { version: 1, rawText, updatedAt: now };
    await setItem(key, JSON.stringify(draft));
    return draft;
  });
}

export async function clearDraft(accountKey: string): Promise<void> {
  const key = draftKey(accountKey);
  await runSerialized(key, () => removeItem(key));
}

export async function pruneExpiredDrafts(now?: number): Promise<void> {
  const fixedNow = now === undefined ? null : assertNow(now);
  const keys = [...new Set(await getAllKeys())]
    .filter((key) => key.startsWith(DRAFT_KEY_PREFIX));

  await Promise.all(keys.map((key) => runSerialized(key, async () => {
    // 기본 시계는 목록 조회·앞선 동일 계정 작업이 끝난 뒤 실제 검사 진입 시 평가한다.
    const checkedAt = fixedNow ?? assertNow(Date.now());
    if (!isCanonicalDraftKey(key)) {
      await removeItem(key);
      return;
    }
    await readKey(key, checkedAt);
  })));
}
