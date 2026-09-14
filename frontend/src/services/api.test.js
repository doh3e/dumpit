// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const { TEST_TOAST_EVENT } = vi.hoisted(() => ({
  TEST_TOAST_EVENT: 'test:api-toast',
}))

vi.mock('./notifyToast', () => ({
  TOAST_EVENT: TEST_TOAST_EVENT,
}))

import api from './api'

describe('API 응답 interceptor', () => {
  const originalAdapter = api.defaults.adapter

  const rejectWithServerError = () => {
    api.defaults.adapter = (config) => Promise.reject({
      config,
      response: { status: 500, data: {} },
    })
    return api.get('/tasks')
  }

  afterEach(() => {
    api.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('서버 오류 알림은 공유 토스트 이벤트 이름을 따른다', async () => {
    const handler = vi.fn()
    window.addEventListener(TEST_TOAST_EVENT, handler, { once: true })

    await expect(rejectWithServerError()).rejects.toBeTruthy()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('서버 오류를 기존 토스트 payload로 전달한다', async () => {
    const handler = vi.fn()
    window.addEventListener(TEST_TOAST_EVENT, handler, { once: true })

    await expect(rejectWithServerError()).rejects.toMatchObject({
      userMessage: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    })
    expect(handler.mock.calls[0][0].detail).toEqual({
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      type: 'error',
    })
  })
})
