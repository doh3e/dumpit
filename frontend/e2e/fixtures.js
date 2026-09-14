import { test as base, expect } from '@playwright/test'

const APP_ORIGIN = 'http://127.0.0.1:5184'

const DEFAULT_TASKS = [
  {
    title: '발표 자료 정리',
    description: '핵심 지표와 다음 단계를 정리한다.',
    aiPriorityScore: 0.82,
    category: 'WORK',
    deadline: '2099-09-20T18:00',
    estimatedMinutes: 45,
  },
  {
    title: '이메일 답장',
    description: '밀린 답장을 확인한다.',
    aiPriorityScore: 0.43,
    category: 'OTHER',
    deadline: null,
    estimatedMinutes: 15,
  },
]

function userFor(email) {
  return {
    email,
    name: email.startsWith('b@') ? '계정 B' : '계정 A',
    picture: null,
    coins: 30,
    isAdmin: false,
    equipments: {},
  }
}

function createState() {
  return {
    user: userFor('a@example.test'),
    settings: {
      routineStartHour: 9,
      routineEndHour: 22,
      notificationsEnabled: true,
      notificationThresholds: [60],
      aiMemory: null,
    },
    analysisResult: { dumpId: '11111111-1111-1111-1111-111111111111', tasks: DEFAULT_TASKS },
    dumps: new Map(),
    nextTaskSequence: 1,
    requests: [],
    externalRequests: [],
    failures: new Map(),
    deferred: new Map(),
  }
}

function takeNext(map, key) {
  const entries = map.get(key) ?? []
  const next = entries.shift()
  if (entries.length === 0) map.delete(key)
  return next
}

function enqueue(map, key, value) {
  map.set(key, [...(map.get(key) ?? []), value])
}

async function requestBody(request) {
  try {
    return request.postDataJSON()
  } catch {
    return null
  }
}

function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

async function handleApi(route, state) {
  const request = route.request()
  const url = new URL(request.url())
  const body = await requestBody(request)
  state.requests.push({ method: request.method(), path: url.pathname, body })

  if (url.pathname === '/api/auth/me' && request.method() === 'GET') {
    return state.user
      ? fulfillJson(route, 200, state.user)
      : fulfillJson(route, 401, { error: '로그인이 필요합니다.' })
  }
  if (url.pathname === '/api/auth/logout' && request.method() === 'POST') {
    state.user = null
    return route.fulfill({ status: 204 })
  }
  if (url.pathname === '/api/dashboard/planning' && request.method() === 'GET') {
    return fulfillJson(route, 200, { tasks: [], focusRecommendations: [] })
  }
  if (url.pathname === '/api/notices/unread' && request.method() === 'GET') {
    return fulfillJson(route, 200, [])
  }
  if (url.pathname === '/api/notifications/deadline-nudges' && request.method() === 'GET') {
    return fulfillJson(route, 200, [])
  }
  if (url.pathname === '/api/calendar/events' && request.method() === 'GET') {
    return fulfillJson(route, 200, [])
  }
  if (url.pathname === '/api/ai-usage' && request.method() === 'GET') {
    return fulfillJson(route, 200, { used: 0, remaining: 100, limit: 100 })
  }
  if (url.pathname === '/api/me/settings' && request.method() === 'GET') {
    return fulfillJson(route, 200, state.settings)
  }
  if (url.pathname === '/api/me/settings' && request.method() === 'PATCH') {
    const deferred = takeNext(state.deferred, 'settings')
    if (deferred) await deferred.promise
    const failure = takeNext(state.failures, 'settings')
    if (failure) return fulfillJson(route, failure.status, failure.body)
    state.settings = { ...state.settings, ...body }
    return fulfillJson(route, 200, state.settings)
  }
  if (url.pathname === '/api/brain-dump' && request.method() === 'POST') {
    const failure = takeNext(state.failures, 'analysis')
    if (failure) return fulfillJson(route, failure.status, failure.body)
    state.dumps.set(state.analysisResult.dumpId, state.user?.email ?? null)
    return fulfillJson(route, 201, state.analysisResult)
  }
  if (/^\/api\/brain-dump\/[^/]+\/confirm$/.test(url.pathname) && request.method() === 'POST') {
    const dumpId = url.pathname.split('/')[3]
    if (!state.dumps.has(dumpId)) {
      return fulfillJson(route, 404, { error: '분석 결과를 찾을 수 없습니다.' })
    }
    if (state.dumps.get(dumpId) !== state.user?.email) {
      return fulfillJson(route, 403, { error: '해당 분석 결과에 접근할 수 없습니다.' })
    }
    const failure = takeNext(state.failures, 'confirm')
    if (failure) return fulfillJson(route, failure.status, failure.body)
    return fulfillJson(route, 201, (body.tasks ?? []).map((task) => {
      const taskSequence = state.nextTaskSequence
      state.nextTaskSequence += 1
      return {
        taskId: `22222222-2222-2222-2222-${String(taskSequence).padStart(12, '0')}`,
        title: task.title,
        description: task.description ?? null,
        aiPriorityScore: task.priorityScore ?? 0.5,
        category: task.category ?? 'OTHER',
        deadline: task.deadline ?? null,
        estimatedMinutes: task.estimatedMinutes ?? null,
      }
    }))
  }

  return fulfillJson(route, 404, { error: `테스트 fixture에 없는 API: ${request.method()} ${url.pathname}` })
}

export const test = base.extend({
  app: [async ({ page }, use) => {
    const state = createState()
    const consoleMessages = []
    const allowedConsole = []

    page.on('console', (message) => {
      if (message.type() === 'warning' || message.type() === 'error') {
        consoleMessages.push({
          type: message.type(),
          text: message.text(),
          url: message.location().url,
        })
      }
    })
    page.on('pageerror', (error) => {
      consoleMessages.push({ type: 'pageerror', text: error.message })
    })

    await page.addInitScript(() => {
      localStorage.setItem('dumpit_help_seen', '1')
      class NotificationMock {
        static permission = 'granted'
        static requestPermission = async () => 'granted'
        constructor() {
          window.__dumpitE2eNotificationCount += 1
        }
        close() {}
      }
      window.__dumpitE2eNotificationCount = 0
      Object.defineProperty(window, 'Notification', { configurable: true, value: NotificationMock })
    })

    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.origin !== APP_ORIGIN) {
        state.externalRequests.push(route.request().url())
        return route.abort('blockedbyclient')
      }
      if (url.pathname.startsWith('/api/')) return handleApi(route, state)
      return route.continue()
    })

    const app = {
      state,
      setUser(email) {
        state.user = email ? userFor(email) : null
      },
      failNext(key, status = 500, body = { error: '의도한 테스트 실패' }) {
        enqueue(state.failures, key, { status, body })
      },
      deferNext(key) {
        let release
        const promise = new Promise((resolve) => { release = resolve })
        enqueue(state.deferred, key, { promise, release })
        return release
      },
      requests(method, path) {
        return state.requests.filter((request) => request.method === method && request.path === path)
      },
      allowConsole(type, pattern, count = 1, urlPattern = null) {
        allowedConsole.push({ type, pattern, count, urlPattern })
      },
    }

    await use(app)

    const harnessWarnings = consoleMessages.filter((message) => (
      message.type === 'warning'
      && message.text === 'Service Worker registration blocked by Playwright'
    ))
    expect(harnessWarnings.length, 'Playwright service worker 차단 안전장치 경고 수').toBeGreaterThan(0)
    const remaining = consoleMessages.filter((message) => !harnessWarnings.includes(message))
    for (const expected of allowedConsole) {
      const matches = remaining.filter((message) => (
        message.type === expected.type
        && expected.pattern.test(message.text)
        && (!expected.urlPattern || expected.urlPattern.test(message.url))
      ))
      expect(
        matches,
        `예상 ${expected.type} 수량: ${expected.pattern} @ ${expected.urlPattern ?? 'any URL'}`,
      ).toHaveLength(expected.count)
      for (const match of matches) remaining.splice(remaining.indexOf(match), 1)
    }
    expect(remaining, '허용하지 않은 console warning/error/pageerror').toEqual([])
    expect(state.externalRequests, 'origin 밖 네트워크 요청').toEqual([])
  }, { auto: true }],
})

export { expect }
