// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalNotification = Object.getOwnPropertyDescriptor(window, 'Notification')
const originalDesktop = Object.getOwnPropertyDescriptor(window, 'dumpitDesktop')
const originalSecureContext = Object.getOwnPropertyDescriptor(window, 'isSecureContext')
const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

function restoreProperty(target, key, descriptor) {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor)
  } else {
    delete target[key]
  }
}

function installNotification(permission = 'granted') {
  const instances = []

  class BrowserNotification {
    static permission = permission

    constructor(title, options) {
      this.title = title
      this.options = options
      this.close = vi.fn()
      instances.push(this)
    }
  }

  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: BrowserNotification,
  })

  return { BrowserNotification, instances }
}

function installServiceWorker(registration) {
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    },
  })
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

async function loadNotifications() {
  return import('./notifications.js')
}

beforeEach(() => {
  vi.resetModules()
  delete window.dumpitDesktop
  delete window.Notification
  delete navigator.serviceWorker
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: false,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  restoreProperty(window, 'Notification', originalNotification)
  restoreProperty(window, 'dumpitDesktop', originalDesktop)
  restoreProperty(window, 'isSecureContext', originalSecureContext)
  restoreProperty(navigator, 'serviceWorker', originalServiceWorker)
})

describe('showBrowserNotification', () => {
  it('데스크톱 IPC true ACK 뒤에만 성공을 반환하고 payload를 그대로 전달한다', async () => {
    installNotification()
    const acknowledgement = deferred()
    const notify = vi.fn(() => acknowledgement.promise)
    window.dumpitDesktop = { notify }
    const { showBrowserNotification } = await loadNotifications()

    let settled = false
    const displayed = showBrowserNotification('테스트 제목', {
      body: '테스트 본문',
      silent: true,
      data: { url: '/기존-경로' },
    }, '/명시-경로').then((value) => {
      settled = true
      return value
    })

    await Promise.resolve()
    expect(settled).toBe(false)
    expect(notify).toHaveBeenCalledWith({
      title: '테스트 제목',
      body: '테스트 본문',
      silent: true,
      clickUrl: '/명시-경로',
    })

    acknowledgement.resolve(true)
    await expect(displayed).resolves.toBe(true)
  })

  it.each([
    ['false', () => false],
    ['reject', () => Promise.reject(new Error('IPC failed'))],
    ['동기 throw', () => { throw new Error('IPC failed') }],
  ])('데스크톱 IPC %s는 다른 알림 경로로 재전송하지 않고 false를 반환한다', async (_label, notifyImplementation) => {
    const { instances } = installNotification()
    const registration = {
      active: true,
      showNotification: vi.fn().mockResolvedValue(undefined),
    }
    installServiceWorker(registration)
    const notify = vi.fn(notifyImplementation)
    window.dumpitDesktop = { notify }
    const { showBrowserNotification } = await loadNotifications()

    await expect(showBrowserNotification('테스트 제목', { body: '본문' }, '/dashboard')).resolves.toBe(false)
    expect(notify).toHaveBeenCalledOnce()
    expect(instances).toHaveLength(0)
    expect(navigator.serviceWorker.getRegistration).not.toHaveBeenCalled()
    expect(registration.showNotification).not.toHaveBeenCalled()
  })

  it('데스크톱 bridge는 기존 options.data.url을 클릭 경로로 보존한다', async () => {
    installNotification()
    const notify = vi.fn().mockResolvedValue(true)
    window.dumpitDesktop = { notify }
    const { showBrowserNotification } = await loadNotifications()

    await expect(showBrowserNotification('테스트 제목', {
      body: '본문',
      silent: false,
      data: { url: '/dashboard' },
    })).resolves.toBe(true)

    expect(notify).toHaveBeenCalledWith({
      title: '테스트 제목',
      body: '본문',
      silent: false,
      clickUrl: '/dashboard',
    })
  })

  it('권한이 없거나 Notification API가 없으면 false를 반환한다', async () => {
    installNotification('denied')
    let notifications = await loadNotifications()
    await expect(notifications.showBrowserNotification('테스트 제목')).resolves.toBe(false)

    vi.resetModules()
    delete window.Notification
    notifications = await loadNotifications()
    await expect(notifications.showBrowserNotification('테스트 제목')).resolves.toBe(false)
  })

  it('비데스크톱에서는 service worker 성공 경로를 유지한다', async () => {
    installNotification()
    const registration = {
      active: true,
      showNotification: vi.fn().mockResolvedValue(undefined),
    }
    installServiceWorker(registration)
    const { showBrowserNotification } = await loadNotifications()
    const options = { body: '본문', tag: '테스트' }

    await expect(showBrowserNotification('테스트 제목', options, '/dashboard')).resolves.toBe(true)
    expect(registration.showNotification).toHaveBeenCalledWith('테스트 제목', {
      ...options,
      data: { url: '/dashboard' },
    })
  })

  it('비데스크톱에서는 일반 Notification 생성자 성공 경로를 유지한다', async () => {
    const { instances } = installNotification()
    const { showBrowserNotification } = await loadNotifications()
    const options = { body: '본문', silent: true }

    await expect(showBrowserNotification('테스트 제목', options)).resolves.toBe(true)
    expect(instances).toHaveLength(1)
    expect(instances[0]).toMatchObject({ title: '테스트 제목', options })
  })
})
