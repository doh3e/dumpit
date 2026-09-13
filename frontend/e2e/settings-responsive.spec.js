import { test, expect } from './fixtures'

async function openSettings(page, width = 1280) {
  if (width >= 1024) {
    await page.locator('header').getByRole('button', { name: '설정', exact: true }).click()
  } else {
    await page.getByRole('button', { name: '메뉴 열기' }).click()
    await page.getByRole('dialog', { name: '메뉴' }).getByRole('button', { name: '설정', exact: true }).click()
  }
  const dialog = page.getByRole('dialog', { name: '설정', exact: true })
  await expect(dialog).toBeVisible()
  return dialog
}

async function expectNoHorizontalOverflow(page, locator = page.locator('html')) {
  expect(await locator.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
}

test('설정의 기기 저장과 알림·활동 시간 서버 저장은 성공·실패·pending을 정확히 반영한다', async ({ page, app }) => {
  app.allowConsole('error', /status of 500/, 2, /\/api\/me\/settings$/)
  await page.goto('/dashboard')
  const headerSettings = page.locator('header').getByRole('button', { name: '설정', exact: true })
  const dialog = await openSettings(page)
  await expect(dialog.getByRole('button', { name: '시작프로그램 등록 토글' })).toHaveCount(0)
  expect(await page.evaluate(() => window.dumpitDesktop)).toBeUndefined()

  await dialog.getByRole('button', { name: '다크', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(dialog.getByText('이 기기에 저장했어요.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('dumpit-theme'))).toBe('dark')

  const notificationToggle = dialog.getByRole('button', { name: '마감 임박 알림 토글' })
  const releaseNotification = app.deferNext('settings')
  await notificationToggle.click()
  await expect(notificationToggle).toBeDisabled()
  await expect.poll(() => app.requests('PATCH', '/api/me/settings').length).toBe(1)
  expect(app.requests('PATCH', '/api/me/settings')).toHaveLength(1)
  releaseNotification()
  await expect(notificationToggle).toBeEnabled()
  await expect(notificationToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(dialog.getByText('알림 설정을 계정에 저장했어요.', { exact: true })).toBeVisible()

  app.failNext('settings', 500, { error: '알림 fixture 실패' })
  await notificationToggle.click()
  await expect(dialog.getByText('알림 fixture 실패', { exact: true })).toBeVisible()
  await expect(notificationToggle).toHaveAttribute('aria-pressed', 'false')
  expect(app.requests('PATCH', '/api/me/settings')).toHaveLength(2)
  expect(await page.evaluate(() => window.__dumpitE2eNotificationCount)).toBe(0)

  const start = dialog.getByLabel('시작')
  await start.selectOption('10')
  await dialog.getByRole('button', { name: '활동 시간 취소' }).click()
  await expect(start).toHaveValue('9')
  expect(app.requests('PATCH', '/api/me/settings').filter((request) => request.body.routineStartHour != null)).toHaveLength(0)

  await start.selectOption('10')
  await dialog.getByRole('button', { name: '활동 시간 저장' }).click()
  await expect(dialog.getByText('활동 시간을 계정에 저장했어요.', { exact: true })).toBeVisible()
  await expect(dialog).toBeVisible()
  expect(app.requests('PATCH', '/api/me/settings').filter((request) => request.body.routineStartHour != null)).toHaveLength(1)

  await start.selectOption('11')
  app.failNext('settings', 500, { error: '활동 시간 fixture 실패' })
  await dialog.getByRole('button', { name: '활동 시간 저장' }).click()
  await expect(dialog.getByText('활동 시간 fixture 실패', { exact: true })).toBeVisible()
  await expect(start).toHaveValue('11')

  const triggers = [
    () => dialog.getByRole('button', { name: '설정 닫기' }).click(),
    () => dialog.getByRole('button', { name: '닫기', exact: true }).click(),
    () => dialog.press('Escape'),
    () => dialog.click({ position: { x: 2, y: 2 } }),
  ]
  for (const trigger of triggers) {
    await trigger()
    const discard = page.getByRole('dialog', { name: '활동 시간 변경 버리기' })
    await expect(discard).toBeVisible()
    await discard.getByRole('button', { name: '계속 수정' }).click()
    await expect(dialog).toBeVisible()
    await expect(start).toHaveValue('11')
  }

  await dialog.getByRole('button', { name: '설정 닫기' }).click()
  await page.getByRole('dialog', { name: '활동 시간 변경 버리기' })
    .getByRole('button', { name: '변경 버리고 닫기' }).click()
  await expect(dialog).toHaveCount(0)

  await headerSettings.click()
  const cleanDialog = page.getByRole('dialog', { name: '설정', exact: true })
  await cleanDialog.getByRole('button', { name: '설정 닫기' }).click()
  await expect(headerSettings).toBeFocused()
})

test('기기 설정 저장 실패는 선택을 바꾸지 않고 설정 가까이에 알린다', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSet = Storage.prototype.setItem
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === 'dumpit-theme') throw new DOMException('의도한 설정 저장 실패', 'QuotaExceededError')
      return originalSet.call(this, key, value)
    }
  })
  await page.goto('/dashboard')
  const dialog = await openSettings(page)
  await dialog.getByRole('button', { name: '다크', exact: true }).click()
  await expect(dialog.getByText('이 기기에 저장하지 못했어요.', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: '다크', exact: true })).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => localStorage.getItem('dumpit-theme'))).toBeNull()
})

for (const width of [320, 360, 1280]) {
  test(`${width}px에서 브레인 덤프·편집·설정은 넘치거나 가리지 않고 키보드 포커스를 보존한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/brain-dump')
    await expect(page.getByRole('heading', { name: '브레인 덤프' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('textbox', { name: '브레인 덤프 입력' }).fill('반응형 확인')
    await page.getByRole('button', { name: 'AI로 정리하기' }).click()
    await page.getByRole('button', { name: '발표 자료 정리 수정' }).click()
    const editor = page.getByRole('form', { name: '발표 자료 정리 수정' })
    await expect(editor.getByLabel('할 일 제목')).toBeFocused()
    await expectNoHorizontalOverflow(page)
    await editor.getByRole('button', { name: '취소' }).click()
    await expect(page.getByRole('button', { name: '발표 자료 정리 수정' })).toBeFocused()

    const dialog = await openSettings(page, width)
    await expectNoHorizontalOverflow(page)
    const box = await dialog.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement))).toBe(true)

    if (width === 360) {
      await dialog.getByRole('button', { name: '아주 크게', exact: true }).click()
      await dialog.getByRole('button', { name: '고대비', exact: true }).click()
      await dialog.getByRole('button', { name: '굵은 글자 끔', exact: true }).click()
      await expect(page.locator('html')).toHaveCSS('font-size', '20px')
      await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high')
      await expect(page.locator('html')).toHaveAttribute('data-bold-text', '1')
      await expectNoHorizontalOverflow(page)
    }

    await dialog.getByRole('button', { name: '설정 닫기' }).click()
    await expect(dialog).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })
}
