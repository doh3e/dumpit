const { contextBridge, ipcRenderer } = require('electron')

let lastTasksKey = ''

const FALLBACK_COLORS = {
  focus: '#D13F30',
  break: '#387F77',
  bg: '#F7EFDF',
  fg: '#33271E',
  sub: '#726553',
  edge: '#3A2C21',
  onAccent: '#FFFBF0',
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function parseRgbChannel(value) {
  const percentage = value.endsWith('%')
  const number = Number.parseFloat(value)
  if (!Number.isFinite(number)) return null
  return clamp(percentage ? number * 2.55 : number, 0, 255)
}

function parseAlpha(value) {
  if (value == null) return 1
  const percentage = value.endsWith('%')
  const number = Number.parseFloat(value)
  if (!Number.isFinite(number)) return null
  return clamp(percentage ? number / 100 : number, 0, 1)
}

function parseCssColor(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  const hex = normalized.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)
  if (hex) {
    const expanded = hex[1].length <= 4
      ? [...hex[1]].map((digit) => digit + digit).join('')
      : hex[1]
    return {
      red: Number.parseInt(expanded.slice(0, 2), 16),
      green: Number.parseInt(expanded.slice(2, 4), 16),
      blue: Number.parseInt(expanded.slice(4, 6), 16),
      alpha: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    }
  }

  const rgb = normalized.match(/^rgba?\((.*)\)$/i)
  if (!rgb) return null

  const body = rgb[1].trim()
  let channels
  let alphaValue
  if (body.includes(',')) {
    const parts = body.split(',').map((part) => part.trim())
    if (parts.length < 3 || parts.length > 4) return null
    channels = parts.slice(0, 3)
    alphaValue = parts[3]
  } else {
    const [channelPart, alphaPart] = body.split('/').map((part) => part.trim())
    channels = channelPart.split(/\s+/)
    alphaValue = alphaPart
    if (channels.length !== 3) return null
  }

  const [red, green, blue] = channels.map(parseRgbChannel)
  const alpha = parseAlpha(alphaValue)
  if ([red, green, blue, alpha].some((channel) => channel == null)) return null
  return { red, green, blue, alpha }
}

function composite(foreground, background) {
  return {
    red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
    green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
    blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
    alpha: 1,
  }
}

function relativeLuminance(color) {
  const channels = [color.red, color.green, color.blue]
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4)
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(foregroundValue, backgroundValue, backdropValue = '#FFFFFF') {
  const foreground = parseCssColor(foregroundValue)
  const background = parseCssColor(backgroundValue)
  const backdrop = parseCssColor(backdropValue)
  if (!foreground || !background || !backdrop) return 0

  const opaqueBackdrop = composite(backdrop, { red: 255, green: 255, blue: 255, alpha: 1 })
  const opaqueBackground = composite(background, opaqueBackdrop)
  const opaqueForeground = composite(foreground, opaqueBackground)
  const foregroundLuminance = relativeLuminance(opaqueForeground)
  const backgroundLuminance = relativeLuminance(opaqueBackground)
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
}

function chooseAccessibleColor(background, backdrop, preferredColors, minimumRatio) {
  for (const color of preferredColors) {
    if (contrastRatio(color, background, backdrop) >= minimumRatio) return color
  }

  const darkRatio = contrastRatio('#000000', background, backdrop)
  const lightRatio = contrastRatio('#FFFFFF', background, backdrop)
  return darkRatio >= lightRatio ? '#000000' : '#FFFFFF'
}

function setDerivedColors(root, colors) {
  const supportedColor = (key) => parseCssColor(colors[key]) ? colors[key].trim() : FALLBACK_COLORS[key]
  const bg = supportedColor('bg')
  const fg = supportedColor('fg')
  const sub = supportedColor('sub')
  const edge = supportedColor('edge')
  const onAccent = supportedColor('onAccent')
  const focus = supportedColor('focus')
  const breakColor = supportedColor('break')

  root.style.setProperty('--pomo-focus-text', chooseAccessibleColor(focus, bg, [onAccent, fg], 4.5))
  root.style.setProperty('--pomo-break-text', chooseAccessibleColor(breakColor, bg, [onAccent, fg], 4.5))
  root.style.setProperty('--control-border', chooseAccessibleColor(bg, '#FFFFFF', [edge, fg], 3))
  root.style.setProperty('--widget-title-text', chooseAccessibleColor(bg, '#FFFFFF', [sub, fg], 4.5))
}

contextBridge.exposeInMainWorld('dumpitPomodoroWidget', {
  close: () => ipcRenderer.send('dumpit:pomodoro-widget-close'),
  command: (command) => ipcRenderer.send('dumpit:pomodoro-widget-command', command),
  openMain: () => ipcRenderer.send('dumpit:pomodoro-widget-open-main'),
  ready: () => ipcRenderer.send('dumpit:pomodoro-widget-ready'),
  onState: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('dumpit:pomodoro-widget-state', listener)
    return () => ipcRenderer.removeListener('dumpit:pomodoro-widget-state', listener)
  },
})

function renderState(payload = {}) {
  // 웹이 보낸 테마 토큰을 로컬 CSS 변수로 반영 (부재 시 기본 토큰 유지 — 구버전 웹 하위호환)
  // pomo 3색 + 크롬 토큰 9종: 다크모드·배경 테마·뽀모도로 스킨이 위젯에 그대로 따라온다
  const colors = payload.colors
  if (colors && typeof colors === 'object') {
    const root = document.documentElement
    const varMap = {
      focus: '--pomo-focus', break: '--pomo-break', ring: '--pomo-ring',
      bg: '--bg', card: '--card', fg: '--fg', sub: '--sub',
      line: '--line', edge: '--edge', chip: '--chip',
      shadowSm: '--shadow-sm', onAccent: '--on-accent',
    }
    for (const [key, cssVar] of Object.entries(varMap)) {
      if (typeof colors[key] === 'string' && colors[key]) {
        root.style.setProperty(cssVar, colors[key])
      }
    }
    setDerivedColors(root, colors)
  }

  const active = payload.active !== false
  const mode = payload.mode === 'BREAK' ? 'BREAK' : 'FOCUS'
  const time = typeof payload.time === 'string' ? payload.time : '--:--'
  const running = Boolean(payload.running)
  const progress = Number.isFinite(payload.progress) ? Math.max(0, Math.min(100, payload.progress)) : 0
  const taskTitle = typeof payload.taskTitle === 'string' && payload.taskTitle.trim()
    ? payload.taskTitle.trim()
    : null
  const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
  const selectedTaskId = typeof payload.selectedTaskId === 'string' ? payload.selectedTaskId : ''
  const circumference = 2 * Math.PI * 42

  document.body.classList.toggle('break', active && mode === 'BREAK')
  document.body.classList.toggle('idle', !active)

  const modeElement = document.getElementById('mode')
  const timeElement = document.getElementById('time')
  const taskElement = document.getElementById('task')
  const openActionElement = document.getElementById('openAction')
  const progressElement = document.getElementById('progress')

  if (modeElement) {
    modeElement.textContent = mode === 'BREAK' ? 'BREAK' : 'FOCUS'
  }
  if (timeElement) {
    timeElement.textContent = active ? time : '--:--'
  }
  if (timeElement) {
    const minutes = active ? Number(String(time).split(':')[0]) : null
    const phase = mode === 'BREAK' ? '휴식' : '집중'
    timeElement.setAttribute('aria-label', minutes == null ? '타이머 대기 중' : `${phase} 남은 시간 ${minutes}분`)
  }
  if (taskElement) {
    const tasksKey = JSON.stringify(tasks.map((task) => [task.id, task.title]))
    if (tasksKey !== lastTasksKey) {
      lastTasksKey = tasksKey
      taskElement.replaceChildren()

      const placeholder = document.createElement('option')
      placeholder.value = ''
      placeholder.textContent = '집중할 태스크 선택'
      taskElement.appendChild(placeholder)

      tasks.forEach((task) => {
        const option = document.createElement('option')
        option.value = String(task.id)
        option.textContent = String(task.title || '제목 없음')
        taskElement.appendChild(option)
      })
    }

    taskElement.value = selectedTaskId
    if (active && taskTitle && !selectedTaskId) {
      taskElement.options[0].textContent = taskTitle
    } else {
      taskElement.options[0].textContent = '집중할 태스크 선택'
    }
  }
  if (openActionElement) {
    openActionElement.textContent = active
      ? running ? '일시정지' : mode === 'BREAK' ? '쉬기시작' : '집중시작'
      : '집중시작'
  }
  if (progressElement) {
    progressElement.style.strokeDashoffset = String(circumference * (1 - progress / 100))
  }
}

window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') ipcRenderer.send('dumpit:pomodoro-widget-close')
  })
  document.getElementById('close')?.addEventListener('click', () => {
    ipcRenderer.send('dumpit:pomodoro-widget-close')
  })
  document.getElementById('open')?.addEventListener('click', () => {
    ipcRenderer.send('dumpit:pomodoro-widget-open-main')
  })
  document.getElementById('openAction')?.addEventListener('click', () => {
    ipcRenderer.send('dumpit:pomodoro-widget-command', 'toggle')
  })
  document.getElementById('resetAction')?.addEventListener('click', () => {
    ipcRenderer.send('dumpit:pomodoro-widget-command', 'reset')
  })
  document.getElementById('task')?.addEventListener('change', (event) => {
    ipcRenderer.send('dumpit:pomodoro-widget-command', {
      type: 'selectTask',
      taskId: event.target.value,
    })
  })

  ipcRenderer.on('dumpit:pomodoro-widget-state', (_event, payload) => renderState(payload))
  ipcRenderer.send('dumpit:pomodoro-widget-ready')
})
