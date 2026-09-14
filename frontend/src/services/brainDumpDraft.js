const DRAFT_KEY_PREFIX = 'dumpit:brain-dump-draft:v1:'
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_RAW_TEXT_LENGTH = 3000
const STORAGE_ERROR_MESSAGE = '원문 초안 저장소에 접근하지 못했습니다.'
const DRAFT_FIELDS = ['version', 'rawText', 'updatedAt']

function assertAccountKey(accountKey) {
  if (typeof accountKey !== 'string' || accountKey.trim().length === 0) {
    throw new TypeError('유효한 계정 키가 필요합니다.')
  }
  return accountKey
}

function assertNow(now) {
  if (typeof now !== 'number' || !Number.isFinite(now) || now < 0) {
    throw new TypeError('유효한 검사 시각이 필요합니다.')
  }
  return now
}

function assertRawText(rawText) {
  if (typeof rawText !== 'string' || rawText.length > MAX_RAW_TEXT_LENGTH) {
    throw new TypeError('원문 초안은 3000자 이하 문자열이어야 합니다.')
  }
  return rawText
}

function draftKey(accountKey) {
  return `${DRAFT_KEY_PREFIX}${encodeURIComponent(assertAccountKey(accountKey))}`
}

function storageFailure() {
  return new Error(STORAGE_ERROR_MESSAGE)
}

function getItem(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    throw storageFailure()
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    throw storageFailure()
  }
}

function removeItem(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    throw storageFailure()
  }
}

function isCanonicalDraftKey(key) {
  const encodedAccount = key.slice(DRAFT_KEY_PREFIX.length)
  if (encodedAccount.length === 0) return false

  try {
    const accountKey = decodeURIComponent(encodedAccount)
    assertAccountKey(accountKey)
    return draftKey(accountKey) === key
  } catch {
    return false
  }
}

function parseDraft(raw, now) {
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const fields = Object.keys(value)
  if (fields.length !== DRAFT_FIELDS.length || !DRAFT_FIELDS.every((field) => Object.hasOwn(value, field))) {
    return null
  }
  if (value.version !== 1) return null
  if (typeof value.rawText !== 'string' || value.rawText.length === 0 || value.rawText.length > MAX_RAW_TEXT_LENGTH) {
    return null
  }
  if (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt) || value.updatedAt < 0) return null
  if (value.updatedAt > now || now - value.updatedAt >= DRAFT_TTL_MS) return null

  return value
}

function readKey(key, now) {
  const raw = getItem(key)
  if (raw === null) return null

  const draft = parseDraft(raw, now)
  if (draft !== null) return draft

  removeItem(key)
  return null
}

export function readDraft(accountKey, now = Date.now()) {
  const key = draftKey(accountKey)
  return readKey(key, assertNow(now))
}

export function writeDraft(accountKey, rawText, now = Date.now()) {
  const key = draftKey(accountKey)
  assertRawText(rawText)
  assertNow(now)

  if (rawText === '') {
    removeItem(key)
    return null
  }

  const draft = { version: 1, rawText, updatedAt: now }
  setItem(key, JSON.stringify(draft))
  return draft
}

export function clearDraft(accountKey) {
  removeItem(draftKey(accountKey))
}

export function pruneExpiredDrafts(now = Date.now()) {
  const checkedAt = assertNow(now)
  const keys = []

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(DRAFT_KEY_PREFIX)) keys.push(key)
    }
  } catch {
    throw storageFailure()
  }

  for (const key of keys) {
    if (!isCanonicalDraftKey(key)) {
      removeItem(key)
      continue
    }
    readKey(key, checkedAt)
  }
}
