const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const shimPath = path.resolve(__dirname, '..', 'electron', 'notification-shim.js')

function loadNotificationShim({ notify } = {}) {
  const clearedTimers = []
  const assignedUrls = []
  const timers = new Map()
  const payloads = []
  let clickListener
  let nextTimerId = 1

  class NativeNotification {}
  class ServiceWorkerRegistration {}

  const originalShowNotification = function originalShowNotification(title, options) {
    return Promise.resolve({ title, options, fallback: true })
  }
  ServiceWorkerRegistration.prototype.showNotification = originalShowNotification

  const window = {
    Notification: NativeNotification,
    ServiceWorkerRegistration,
    clearTimeout(id) {
      clearedTimers.push(id)
      timers.delete(id)
    },
    dumpitDesktop: {
      notify(payload) {
        payloads.push(payload)
        return notify ? notify(payload) : Promise.resolve(true)
      },
      onNotificationClick(listener) {
        clickListener = listener
        return () => { clickListener = undefined }
      },
    },
    location: {
      assign(url) {
        assignedUrls.push(url)
      },
    },
    setTimeout(callback, delay) {
      const id = nextTimerId++
      timers.set(id, { callback, delay })
      return id
    },
  }

  const source = fs.readFileSync(shimPath, 'utf8')
  vm.runInNewContext(source, { window }, { filename: shimPath })

  return {
    NativeNotification,
    assignedUrls,
    clearedTimers,
    click(payload) {
      assert.equal(typeof clickListener, 'function')
      clickListener(payload)
    },
    originalShowNotification,
    payloads,
    timers,
    window,
  }
}

test('Notification 권한과 IPC payload를 기존 계약대로 전달한다', async () => {
  const harness = loadNotificationShim()
  let callbackPermission

  assert.equal(harness.window.Notification.permission, 'granted')
  assert.equal(await harness.window.Notification.requestPermission((permission) => {
    callbackPermission = permission
  }), 'granted')
  assert.equal(callbackPermission, 'granted')

  const notification = new harness.window.Notification('집중 완료', {
    body: '잠깐 쉬어가세요.',
    silent: true,
    data: { url: '/dashboard' },
  })

  assert.equal(notification.title, '집중 완료')
  assert.equal(notification.options.body, '잠깐 쉬어가세요.')
  assert.deepEqual({ ...harness.payloads[0] }, {
    id: '1',
    title: '집중 완료',
    body: '잠깐 쉬어가세요.',
    silent: true,
    clickUrl: '/dashboard',
  })
  assert.equal([...harness.timers.values()][0].delay, 10 * 60 * 1000)
})

test('Notification 클릭은 onclick을 전달하고 타이머와 등록을 정리한다', () => {
  const harness = loadNotificationShim()
  const notification = new harness.window.Notification('완료', { data: { url: '/tasks' } })
  let clickTarget
  notification.onclick = (event) => { clickTarget = event.target }

  harness.click({ id: '1', clickUrl: '/tasks' })

  assert.equal(clickTarget, notification)
  assert.deepEqual(harness.clearedTimers, [1])
  assert.deepEqual(harness.assignedUrls, [])

  harness.click({ id: '1', clickUrl: '/tasks' })
  assert.deepEqual(harness.assignedUrls, ['/tasks'])
})

test('Notification 닫기와 IPC 실패는 cleanup을 수행한다', async () => {
  const closedHarness = loadNotificationShim()
  const notification = new closedHarness.window.Notification('닫기')
  notification.close()
  assert.deepEqual(closedHarness.clearedTimers, [1])
  assert.equal(closedHarness.timers.size, 0)

  const failedHarness = loadNotificationShim({ notify: () => Promise.reject(new Error('IPC failed')) })
  new failedHarness.window.Notification('실패', { data: { url: '/fallback' } })
  await new Promise((resolve) => setImmediate(resolve))

  assert.deepEqual(failedHarness.clearedTimers, [1])
  assert.equal(failedHarness.timers.size, 0)
  failedHarness.click({ id: '1', clickUrl: '/fallback' })
  assert.deepEqual(failedHarness.assignedUrls, ['/fallback'])
})

test('ServiceWorkerRegistration 알림은 IPC를 쓰고 실패하면 원래 구현으로 복귀한다', async () => {
  const successful = loadNotificationShim()
  const successResult = await successful.window.ServiceWorkerRegistration.prototype.showNotification(
    '루틴',
    { body: '시작할 시간이에요.', data: { url: '/routines' } },
  )
  assert.equal(successResult, true)
  assert.deepEqual({ ...successful.payloads[0] }, {
    id: '1',
    title: '루틴',
    body: '시작할 시간이에요.',
    silent: undefined,
    clickUrl: '/routines',
  })

  const failed = loadNotificationShim({ notify: () => Promise.reject(new Error('IPC failed')) })
  const fallback = await failed.window.ServiceWorkerRegistration.prototype.showNotification(
    '루틴',
    { body: '복귀' },
  )
  assert.equal(fallback.fallback, true)
  assert.equal(fallback.title, '루틴')
  assert.equal(fallback.options.body, '복귀')
})
