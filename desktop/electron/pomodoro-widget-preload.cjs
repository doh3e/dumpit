const { contextBridge, ipcRenderer } = require('electron')

let lastTasksKey = ''

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
