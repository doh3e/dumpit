const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const widgetPreloadPath = path.resolve(__dirname, '..', 'electron', 'pomodoro-widget-preload.cjs')
const widgetHtmlPath = path.resolve(__dirname, '..', 'electron', 'pomodoro-widget.html')

class FakeClassList {
  constructor() {
    this.values = new Set()
  }

  contains(name) {
    return this.values.has(name)
  }

  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force)
    if (enabled) {
      this.values.add(name)
    } else {
      this.values.delete(name)
    }
    return enabled
  }
}

class FakeStyle {
  constructor() {
    this.properties = new Map()
  }

  get strokeDashoffset() {
    return this.properties.get('strokeDashoffset') || ''
  }

  set strokeDashoffset(value) {
    this.properties.set('strokeDashoffset', String(value))
  }

  setProperty(name, value) {
    this.properties.set(name, String(value))
  }
}

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase()
    this.attributes = {}
    this.children = []
    this.classList = new FakeClassList()
    this.listeners = new Map()
    this.replaceChildrenCalls = 0
    this.style = new FakeStyle()
    this.textContent = ''
    this.value = ''
  }

  get options() {
    return this.children
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  appendChild(child) {
    this.children.push(child)
    return child
  }

  dispatchEvent(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ target: this, ...event })
    }
  }

  replaceChildren(...children) {
    this.replaceChildrenCalls += 1
    this.children = [...children]
    if (this.tagName === 'SELECT') this.value = ''
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value)
  }
}

function createEventTarget() {
  const listeners = new Map()
  return {
    addEventListener(type, listener) {
      const registered = listeners.get(type) || []
      registered.push(listener)
      listeners.set(type, registered)
    },
    dispatchEvent(type, event = {}) {
      for (const listener of listeners.get(type) || []) {
        listener(event)
      }
    },
  }
}

function loadWidgetPreload() {
  const ids = ['open', 'close', 'mode', 'time', 'task', 'openAction', 'resetAction', 'progress']
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id === 'task' ? 'select' : 'div')]))
  const documentEvents = createEventTarget()
  const windowEvents = createEventTarget()
  const rootStyle = new FakeStyle()
  const sent = []
  const ipcListeners = new Map()
  const exposed = new Map()

  const document = {
    ...documentEvents,
    body: new FakeElement('body'),
    documentElement: { style: rootStyle },
    createElement: (tagName) => new FakeElement(tagName),
    getElementById: (id) => elements[id] || null,
  }
  const window = { ...windowEvents }
  const ipcRenderer = {
    on(channel, listener) {
      ipcListeners.set(channel, listener)
    },
    removeListener(channel, listener) {
      if (ipcListeners.get(channel) === listener) ipcListeners.delete(channel)
    },
    send(...args) {
      sent.push(args)
    },
  }
  const contextBridge = {
    exposeInMainWorld(name, value) {
      exposed.set(name, value)
    },
  }
  const source = fs.readFileSync(widgetPreloadPath, 'utf8')

  vm.runInNewContext(source, {
    document,
    require(specifier) {
      assert.equal(specifier, 'electron')
      return { contextBridge, ipcRenderer }
    },
    window,
  }, { filename: widgetPreloadPath })

  window.dispatchEvent('DOMContentLoaded')

  return {
    document,
    elements,
    exposed,
    ipcListeners,
    rootVariables: rootStyle.properties,
    sent,
  }
}

function sendState(harness, payload) {
  const listener = harness.ipcListeners.get('dumpit:pomodoro-widget-state')
  assert.equal(typeof listener, 'function')
  listener({}, payload)
}

test('contextBridge API가 기존 IPC 채널과 상태 구독 해제를 유지한다', () => {
  const harness = loadWidgetPreload()
  const api = harness.exposed.get('dumpitPomodoroWidget')
  let receivedState = null

  assert.ok(api)
  const unsubscribe = api.onState((payload) => {
    receivedState = payload
  })
  const stateListener = harness.ipcListeners.get('dumpit:pomodoro-widget-state')
  stateListener({}, { mode: 'BREAK' })
  assert.equal(receivedState.mode, 'BREAK')

  api.close()
  api.command('toggle')
  api.openMain()
  api.ready()

  assert.equal(harness.sent.filter(([channel]) => channel === 'dumpit:pomodoro-widget-close').length, 1)
  assert.deepEqual(harness.sent.find(([channel, command]) =>
    channel === 'dumpit:pomodoro-widget-command' && command === 'toggle'),
  ['dumpit:pomodoro-widget-command', 'toggle'])
  assert.equal(harness.sent.filter(([channel]) => channel === 'dumpit:pomodoro-widget-open-main').length, 1)
  assert.equal(harness.sent.filter(([channel]) => channel === 'dumpit:pomodoro-widget-ready').length, 2)

  unsubscribe()
  assert.equal(harness.ipcListeners.has('dumpit:pomodoro-widget-state'), false)
})

test('위젯 상태가 모드, 시간 의미, 스킨 색상과 선택된 태스크를 렌더링한다', () => {
  const harness = loadWidgetPreload()
  const { document, elements, rootVariables } = harness
  const colors = {
    focus: '#D95F52',
    break: '#3E8E85',
    ring: '#E0D2B6',
    bg: '#F7EFDF',
    card: '#FFFDF6',
    fg: '#33271E',
    sub: '#8C7C66',
    line: '#E0D2B6',
    edge: '#3A2C21',
    chip: '#F0DFBB',
    shadowSm: '#DCC5A0',
    onAccent: '#FFFBF0',
  }

  sendState(harness, {
    active: true,
    mode: 'FOCUS',
    time: '24:59',
    running: true,
    progress: 25,
    selectedTaskId: 'task-1',
    tasks: [
      { id: 'task-1', title: '발표 초안 작성' },
      { id: 'task-2', title: '빨래 완료' },
    ],
    colors,
  })

  assert.equal(elements.mode.textContent, 'FOCUS')
  assert.equal(elements.time.textContent, '24:59')
  assert.equal(elements.time.attributes['aria-label'], '집중 남은 시간 24분')
  assert.equal(elements.openAction.textContent, '일시정지')
  assert.equal(elements.task.value, 'task-1')
  assert.deepEqual(elements.task.options.map(({ value, textContent }) => ({ value, textContent })), [
    { value: '', textContent: '집중할 태스크 선택' },
    { value: 'task-1', textContent: '발표 초안 작성' },
    { value: 'task-2', textContent: '빨래 완료' },
  ])
  assert.equal(document.body.classList.contains('break'), false)
  assert.equal(document.body.classList.contains('idle'), false)
  assert.equal(rootVariables.get('--pomo-focus'), '#D95F52')
  assert.equal(rootVariables.get('--pomo-break'), '#3E8E85')
  assert.equal(rootVariables.get('--pomo-ring'), '#E0D2B6')
  assert.equal(rootVariables.get('--bg'), '#F7EFDF')
  assert.equal(rootVariables.get('--card'), '#FFFDF6')
  assert.equal(rootVariables.get('--fg'), '#33271E')
  assert.equal(rootVariables.get('--sub'), '#8C7C66')
  assert.equal(rootVariables.get('--line'), '#E0D2B6')
  assert.equal(rootVariables.get('--edge'), '#3A2C21')
  assert.equal(rootVariables.get('--chip'), '#F0DFBB')
  assert.equal(rootVariables.get('--shadow-sm'), '#DCC5A0')
  assert.equal(rootVariables.get('--on-accent'), '#FFFBF0')
})

test('태스크 목록은 내용이 바뀔 때만 교체하고 선택 상태는 매 상태마다 유지한다', () => {
  const harness = loadWidgetPreload()
  const tasks = [
    { id: 'task-1', title: '발표 초안 작성' },
    { id: 'task-2', title: '빨래 완료' },
  ]

  sendState(harness, { tasks, selectedTaskId: 'task-1' })
  assert.equal(harness.elements.task.replaceChildrenCalls, 1)
  assert.equal(harness.elements.task.value, 'task-1')

  sendState(harness, {
    tasks: [
      { id: 'task-1', title: '발표 초안 작성' },
      { id: 'task-2', title: '빨래 완료' },
    ],
    selectedTaskId: 'task-2',
  })
  assert.equal(harness.elements.task.replaceChildrenCalls, 1)
  assert.equal(harness.elements.task.value, 'task-2')

  sendState(harness, {
    tasks: [{ id: 'task-1', title: '수정된 발표 초안' }],
    selectedTaskId: 'task-1',
  })
  assert.equal(harness.elements.task.replaceChildrenCalls, 2)
  assert.equal(harness.elements.task.options[1].textContent, '수정된 발표 초안')
  assert.equal(harness.elements.task.value, 'task-1')
})

test('휴식과 대기 상태가 모드, 시간 라벨과 연결 태스크 제목을 구분한다', () => {
  const harness = loadWidgetPreload()

  sendState(harness, {
    active: true,
    mode: 'BREAK',
    time: '05:00',
    running: false,
    taskTitle: '진행 중인 태스크',
    tasks: [],
  })

  assert.equal(harness.elements.mode.textContent, 'BREAK')
  assert.equal(harness.elements.time.attributes['aria-label'], '휴식 남은 시간 5분')
  assert.equal(harness.elements.openAction.textContent, '쉬기시작')
  assert.equal(harness.elements.task.options[0].textContent, '진행 중인 태스크')
  assert.equal(harness.document.body.classList.contains('break'), true)

  sendState(harness, { active: false, mode: 'FOCUS', time: '25:00', tasks: [] })

  assert.equal(harness.elements.time.textContent, '--:--')
  assert.equal(harness.elements.time.attributes['aria-label'], '타이머 대기 중')
  assert.equal(harness.elements.openAction.textContent, '집중시작')
  assert.equal(harness.elements.task.options[0].textContent, '집중할 태스크 선택')
  assert.equal(harness.document.body.classList.contains('break'), false)
  assert.equal(harness.document.body.classList.contains('idle'), true)
})

test('진행률은 0에서 100 사이로 제한한다', () => {
  const harness = loadWidgetPreload()
  const circumference = 2 * Math.PI * 42

  sendState(harness, { progress: 120 })
  assert.equal(Number(harness.elements.progress.style.strokeDashoffset), 0)

  sendState(harness, { progress: -25 })
  assert.equal(Number(harness.elements.progress.style.strokeDashoffset), circumference)

  sendState(harness, { progress: Number.NaN })
  assert.equal(Number(harness.elements.progress.style.strokeDashoffset), circumference)
})

test('위젯 조작이 기존 IPC 채널과 명령을 전송한다', () => {
  const harness = loadWidgetPreload()
  const { document, elements, sent } = harness

  assert.deepEqual(sent[0], ['dumpit:pomodoro-widget-ready'])

  elements.openAction.dispatchEvent('click')
  assert.deepEqual(sent.find(([channel]) => channel === 'dumpit:pomodoro-widget-command'),
    ['dumpit:pomodoro-widget-command', 'toggle'])

  elements.resetAction.dispatchEvent('click')
  assert.deepEqual(sent.filter(([channel]) => channel === 'dumpit:pomodoro-widget-command')[1],
    ['dumpit:pomodoro-widget-command', 'reset'])

  elements.task.value = 'task-2'
  elements.task.dispatchEvent('change')
  const [selectTaskChannel, selectTaskCommand] = sent
    .filter(([channel]) => channel === 'dumpit:pomodoro-widget-command')[2]
  assert.equal(selectTaskChannel, 'dumpit:pomodoro-widget-command')
  assert.equal(selectTaskCommand.type, 'selectTask')
  assert.equal(selectTaskCommand.taskId, 'task-2')

  elements.open.dispatchEvent('click')
  elements.close.dispatchEvent('click')
  document.dispatchEvent('keydown', { key: 'Escape' })

  assert.equal(sent.filter(([channel]) => channel === 'dumpit:pomodoro-widget-open-main').length, 1)
  assert.equal(sent.filter(([channel]) => channel === 'dumpit:pomodoro-widget-close').length, 2)
})

test('위젯 HTML이 preload가 사용하는 DOM 요소를 제공한다', () => {
  const html = fs.readFileSync(widgetHtmlPath, 'utf8')
  const requiredIds = ['open', 'close', 'mode', 'time', 'task', 'openAction', 'resetAction', 'progress']

  for (const id of requiredIds) {
    assert.match(html, new RegExp(`<[^>]+\\bid=["']${id}["']`), `id="${id}" 요소가 필요합니다`)
  }
})
