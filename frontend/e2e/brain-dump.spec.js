import { test, expect } from './fixtures'

const DRAFT_PREFIX = 'dumpit:brain-dump-draft:v1:'
const draftKey = (email) => `${DRAFT_PREFIX}${encodeURIComponent(email)}`

async function openBrainDump(page) {
  await page.goto('/brain-dump')
  await expect(page.getByRole('heading', { name: '브레인 덤프' })).toBeVisible()
}

async function analyze(page) {
  await page.getByRole('button', { name: 'AI로 정리하기' }).click()
  await expect(page.getByRole('heading', { name: '정리한 할 일' })).toBeFocused()
}

async function confirmThroughBrowser(page, dumpId) {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/brain-dump/${id}/confirm`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ tasks: [{ title: '계약 확인 태스크' }] }),
    })
    return { status: response.status, body: await response.json() }
  }, dumpId)
}

test('원문 초안은 계정별로 화면 이동·새로고침·세션 만료 뒤 복구되고 AI 결과는 복구하지 않는다', async ({ page, app }) => {
  app.allowConsole('error', /status of 401/, 2, /\/api\/auth\/me$/)
  const rawText = '  첫 줄 그대로  \n둘째 줄\n'
  await openBrainDump(page)
  const input = page.getByRole('textbox', { name: '브레인 덤프 입력' })
  await input.fill(rawText)
  await expect(page.getByText('원문 초안 저장됨', { exact: true })).toBeVisible()

  await page.goto('/dashboard')
  await openBrainDump(page)
  await expect(input).toHaveValue(rawText)

  await analyze(page)
  expect(app.requests('POST', '/api/brain-dump')).toHaveLength(1)
  await page.reload()
  await expect(input).toHaveValue(rawText)
  await expect(page.getByRole('heading', { name: '정리한 할 일' })).toHaveCount(0)
  expect(app.requests('POST', '/api/brain-dump')).toHaveLength(1)

  app.setUser('b@example.test')
  await page.reload()
  await expect(input).toHaveValue('')
  await input.fill('B 계정 원문')

  app.setUser('a@example.test')
  await page.reload()
  await expect(input).toHaveValue(rawText)

  app.setUser(null)
  await page.reload()
  await expect(page).toHaveURL('/')
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey('a@example.test'))).not.toBeNull()

  app.setUser('a@example.test')
  await openBrainDump(page)
  await expect(input).toHaveValue(rawText)
  await page.getByRole('button', { name: '계정 메뉴' }).click()
  await page.getByRole('button', { name: '로그아웃' }).click()
  await expect(page).toHaveURL('/')
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey('a@example.test'))).toBeNull()
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey('b@example.test'))).not.toBeNull()
})

test('분석 후보의 선택·편집 적용·취소를 보존해 선택한 값만 201 confirm payload로 보낸다', async ({ page, app }) => {
  await openBrainDump(page)
  await page.getByRole('textbox', { name: '브레인 덤프 입력' }).fill('발표 자료와 이메일을 정리해줘')
  await analyze(page)

  const secondCheckbox = page.getByRole('checkbox', { name: '이메일 답장 선택' })
  await secondCheckbox.uncheck()

  const secondEdit = page.getByRole('button', { name: '이메일 답장 수정' })
  await secondEdit.click()
  await expect(secondCheckbox).not.toBeChecked()
  await page.getByRole('form', { name: '이메일 답장 수정' }).getByLabel('할 일 제목').fill('버릴 수정')
  await page.getByRole('form', { name: '이메일 답장 수정' }).getByRole('button', { name: '취소' }).click()
  await expect(secondEdit).toBeFocused()
  await expect(page.getByText('이메일 답장', { exact: true })).toBeVisible()
  await expect(secondCheckbox).not.toBeChecked()

  await page.getByRole('button', { name: '발표 자료 정리 수정' }).click()
  const editor = page.getByRole('form', { name: '발표 자료 정리 수정' })
  await editor.getByLabel('할 일 제목').fill('  편집한 발표 자료  ')
  await editor.getByLabel('마감 일시 (선택)').fill('2099-10-21T19:30')
  await editor.getByLabel('예상 시간 (선택)').fill('75')
  await editor.getByRole('button', { name: '적용' }).click()

  await expect(page.getByText('편집한 발표 자료', { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: '편집한 발표 자료 선택' })).toBeChecked()
  expect(app.requests('POST', '/api/brain-dump')).toHaveLength(1)
  await page.getByRole('button', { name: '선택한 1개 추가' }).click()
  await expect(page).toHaveURL('/dashboard')

  const confirms = app.requests('POST', '/api/brain-dump/11111111-1111-1111-1111-111111111111/confirm')
  expect(confirms).toHaveLength(1)
  expect(confirms[0].body).toEqual({
    tasks: [{
      title: '편집한 발표 자료',
      description: '핵심 지표와 다음 단계를 정리한다.',
      priorityScore: 0.82,
      category: 'WORK',
      deadline: '2099-10-21T19:30',
      estimatedMinutes: 75,
    }],
  })
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey('a@example.test'))).toBeNull()
})

test('confirm fixture는 없는 dump·다른 계정을 거부하고 같은 dump 반복 호출마다 새 태스크를 만든다', async ({ page, app }) => {
  app.allowConsole('error', /status of 403/, 1, /\/api\/brain-dump\/[^/]+\/confirm$/)
  app.allowConsole('error', /status of 404/, 1, /\/api\/brain-dump\/[^/]+\/confirm$/)
  await openBrainDump(page)
  await page.getByRole('textbox', { name: '브레인 덤프 입력' }).fill('fixture 계약 확인')
  await analyze(page)

  const dumpId = '11111111-1111-1111-1111-111111111111'
  app.setUser('b@example.test')
  expect((await confirmThroughBrowser(page, dumpId)).status).toBe(403)

  app.setUser('a@example.test')
  expect((await confirmThroughBrowser(page, '00000000-0000-0000-0000-000000000000')).status).toBe(404)

  const first = await confirmThroughBrowser(page, dumpId)
  const second = await confirmThroughBrowser(page, dumpId)
  expect(first.status).toBe(201)
  expect(second.status).toBe(201)
  expect(first.body[0].taskId).not.toBe(second.body[0].taskId)
})

test('분석·등록 실패는 원문·이전 결과·선택·편집을 보존하고 자동 재시도하지 않는다', async ({ page, app }) => {
  app.allowConsole('error', /status of 503/, 1, /\/api\/brain-dump$/)
  app.allowConsole('error', /status of 500/, 1, /\/api\/brain-dump\/[^/]+\/confirm$/)
  await openBrainDump(page)
  const input = page.getByRole('textbox', { name: '브레인 덤프 입력' })
  await input.fill('실패해도 보존할 원문')
  await analyze(page)
  await page.getByRole('checkbox', { name: '이메일 답장 선택' }).uncheck()
  await page.getByRole('button', { name: '발표 자료 정리 수정' }).click()
  const editor = page.getByRole('form', { name: '발표 자료 정리 수정' })
  await editor.getByLabel('할 일 제목').fill('실패 뒤 남을 제목')
  await editor.getByRole('button', { name: '적용' }).click()

  app.failNext('analysis', 503, { error: '분석 fixture 실패' })
  await page.getByRole('button', { name: '다시 분석' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('분석 fixture 실패')
  await expect(input).toHaveValue('실패해도 보존할 원문')
  await expect(page.getByText('실패 뒤 남을 제목', { exact: true })).toBeVisible()
  expect(app.requests('POST', '/api/brain-dump')).toHaveLength(2)

  app.failNext('confirm', 500, { error: '등록 fixture 실패' })
  await page.getByRole('button', { name: '선택한 1개 추가' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('등록 fixture 실패')
  await expect(input).toHaveValue('실패해도 보존할 원문')
  await expect(page.getByText('실패 뒤 남을 제목', { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: '이메일 답장 선택' })).not.toBeChecked()
  expect(app.requests('POST', '/api/brain-dump/11111111-1111-1111-1111-111111111111/confirm')).toHaveLength(1)
})

test('초안 삭제 실패는 confirm 성공을 되돌리거나 다시 보내지 않는다', async ({ page, app }) => {
  await page.addInitScript((prefix) => {
    const originalRemove = Storage.prototype.removeItem
    Storage.prototype.removeItem = function removeItem(key) {
      if (String(key).startsWith(prefix)) throw new DOMException('의도한 삭제 실패', 'QuotaExceededError')
      return originalRemove.call(this, key)
    }
  }, DRAFT_PREFIX)

  await openBrainDump(page)
  await page.getByRole('textbox', { name: '브레인 덤프 입력' }).fill('삭제 실패 원문')
  await analyze(page)
  await page.getByRole('button', { name: '선택한 2개 추가' }).click()

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByText('할 일은 등록했지만 원문 초안을 지우지 못했어요.', { exact: true })).toBeVisible()
  expect(app.requests('POST', '/api/brain-dump/11111111-1111-1111-1111-111111111111/confirm')).toHaveLength(1)
})

test('초안 저장소 quota 실패는 입력 화면을 유지하고 성공 ACK를 표시하지 않는다', async ({ page }) => {
  await page.addInitScript((prefix) => {
    const originalSet = Storage.prototype.setItem
    Storage.prototype.setItem = function setItem(key, value) {
      if (String(key).startsWith(prefix)) throw new DOMException('의도한 quota 실패', 'QuotaExceededError')
      return originalSet.call(this, key, value)
    }
  }, DRAFT_PREFIX)

  await openBrainDump(page)
  const input = page.getByRole('textbox', { name: '브레인 덤프 입력' })
  await input.fill('저장되지 않아도 화면에는 남는다')
  await expect(input).toHaveValue('저장되지 않아도 화면에는 남는다')
  await expect(page.getByText('이 기기에 저장하지 못했어요', { exact: true })).toBeVisible()
  await expect(page.getByText('원문 초안 저장됨', { exact: true })).toHaveCount(0)
})

test('초안 저장소 읽기 실패는 빈 입력과 명확한 오류 상태로 안전하게 열린다', async ({ page }) => {
  await page.addInitScript(({ key, prefix }) => {
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      rawText: '읽을 수 없는 저장 원문',
      updatedAt: Date.now(),
    }))
    const originalGet = Storage.prototype.getItem
    Storage.prototype.getItem = function getItem(itemKey) {
      if (String(itemKey).startsWith(prefix)) throw new DOMException('의도한 읽기 실패', 'SecurityError')
      return originalGet.call(this, itemKey)
    }
  }, { key: draftKey('a@example.test'), prefix: DRAFT_PREFIX })

  await openBrainDump(page)
  await expect(page.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('')
  await expect(page.getByText('이 기기에 저장하지 못했어요', { exact: true })).toBeVisible()
})
