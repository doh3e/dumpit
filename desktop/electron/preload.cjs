const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dumpitDesktop', {
  notify: (payload) => ipcRenderer.invoke('dumpit:notify', payload),
  updatePomodoroState: (payload) => ipcRenderer.send('dumpit:pomodoro-state', payload),
  onNotificationClick: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('dumpit:notification-click', listener)
    return () => ipcRenderer.removeListener('dumpit:notification-click', listener)
  },
})

ipcRenderer.on('dumpit:open-settings', () => {
  const buttons = Array.from(document.querySelectorAll('button'))
  const settingsButton = buttons.find((button) => button.textContent?.trim() === '설정')
  settingsButton?.click()
})

function findPomodoroState() {
  const timeElement = Array.from(document.querySelectorAll('span'))
    .find((element) => /^\d{2}:\d{2}$/.test(element.textContent?.trim() || ''))

  if (!timeElement) return null

  let root = timeElement.parentElement
  for (let i = 0; i < 8 && root; i += 1) {
    const modeElement = Array.from(root.querySelectorAll('div, span'))
      .find((element) => ['FOCUS', 'BREAK'].includes(element.textContent?.trim()))

    if (modeElement) {
      const buttonText = Array.from(root.querySelectorAll('button'))
        .map((button) => button.textContent || '')
        .join(' ')

      return {
        mode: modeElement.textContent.trim(),
        time: timeElement.textContent.trim(),
        running: buttonText.includes('일시정지'),
      }
    }

    root = root.parentElement
  }

  const modeElement = Array.from(document.querySelectorAll('div, span'))
    .find((element) => ['FOCUS', 'BREAK'].includes(element.textContent?.trim()))

  if (!modeElement) return null

  const buttonText = Array.from(document.querySelectorAll('button'))
    .map((button) => button.textContent || '')
    .join(' ')

  return {
    mode: modeElement.textContent.trim(),
    time: timeElement.textContent.trim(),
    running: buttonText.includes('일시정지'),
  }
}

function installPomodoroTraySync() {
  let lastSerializedState = ''
  let lastCompletionKey = ''

  const sync = () => {
    const state = findPomodoroState()
    if (!state) return

    const serializedState = JSON.stringify(state)
    if (serializedState !== lastSerializedState) {
      lastSerializedState = serializedState
      window.dumpitDesktop?.updatePomodoroState(state)
    }

    const completionKey = `${state.mode}:${state.time}:${state.running}`
    if (state.running && state.time === '00:00' && completionKey !== lastCompletionKey) {
      lastCompletionKey = completionKey
      window.dumpitDesktop?.notify({
        title: state.mode === 'BREAK' ? 'Dumpit! 휴식이 끝났어요' : 'Dumpit! 집중 완료',
        body: state.mode === 'BREAK'
          ? '다시 집중할 준비가 됐어요.'
          : '좋아요. 잠깐 쉬어갈 시간이에요.',
      }).catch(() => {})
    }
  }

  window.setInterval(sync, 1000)
  window.addEventListener('focus', sync)
  window.addEventListener('visibilitychange', sync)
  sync()
}

function updateDesktopRouteClass() {
  document.documentElement.classList.toggle(
    'dumpit-desktop-home',
    window.location.pathname === '/'
  )
}

function installNotificationShim() {
  const script = document.createElement('script')
  script.textContent = `
    (() => {
      if (!window.dumpitDesktop) return

      let nextNotificationId = 1
      const notifications = new Map()

      window.dumpitDesktop.onNotificationClick(({ id, clickUrl }) => {
        const notification = notifications.get(id)
        if (notification?.onclick) {
          notification.onclick({ target: notification })
        } else if (clickUrl) {
          window.location.assign(clickUrl)
        }
        notifications.delete(id)
      })

      class DesktopNotification {
        static get permission() {
          return 'granted'
        }

        static requestPermission(callback) {
          if (typeof callback === 'function') callback('granted')
          return Promise.resolve('granted')
        }

        constructor(title, options = {}) {
          this.title = title
          this.options = options
          this.onclick = null
          this.id = String(nextNotificationId++)
          notifications.set(this.id, this)

          window.dumpitDesktop.notify({
            id: this.id,
            title,
            body: options.body,
            silent: options.silent,
            clickUrl: options.data?.url,
          }).catch(() => {
            notifications.delete(this.id)
          })
        }

        close() {
          notifications.delete(this.id)
        }
      }

      Object.defineProperty(window, 'Notification', {
        configurable: true,
        writable: true,
        value: DesktopNotification,
      })

      if (window.ServiceWorkerRegistration?.prototype?.showNotification) {
        const originalShowNotification = window.ServiceWorkerRegistration.prototype.showNotification
        window.ServiceWorkerRegistration.prototype.showNotification = function showNotification(title, options = {}) {
          return window.dumpitDesktop.notify({
            id: String(nextNotificationId++),
            title,
            body: options.body,
            silent: options.silent,
            clickUrl: options.data?.url,
          }).catch(() => originalShowNotification.call(this, title, options))
        }
      }
    })()
  `
  document.documentElement.appendChild(script)
  script.remove()
}

// Keep desktop-only presentation tweaks isolated from the shared web app.
window.addEventListener('DOMContentLoaded', () => {
  installNotificationShim()
  installPomodoroTraySync()
  document.documentElement.classList.add('dumpit-desktop')
  updateDesktopRouteClass()

  const originalPushState = window.history.pushState
  const originalReplaceState = window.history.replaceState

  window.history.pushState = function pushState(...args) {
    const result = originalPushState.apply(this, args)
    updateDesktopRouteClass()
    return result
  }

  window.history.replaceState = function replaceState(...args) {
    const result = originalReplaceState.apply(this, args)
    updateDesktopRouteClass()
    return result
  }

  window.addEventListener('popstate', updateDesktopRouteClass)

  const style = document.createElement('style')
  style.textContent = `
    .dumpit-desktop {
      scrollbar-width: thin;
      scrollbar-color: rgba(26, 26, 26, 0.28) transparent;
    }

    .dumpit-desktop ::-webkit-scrollbar {
      width: 9px;
      height: 9px;
    }

    .dumpit-desktop ::-webkit-scrollbar-track {
      background: transparent;
    }

    .dumpit-desktop ::-webkit-scrollbar-thumb {
      background: rgba(26, 26, 26, 0.22);
      border: 2px solid transparent;
      border-radius: 999px;
      background-clip: padding-box;
    }

    .dumpit-desktop ::-webkit-scrollbar-thumb:hover {
      background: rgba(224, 93, 93, 0.45);
      border: 2px solid transparent;
      background-clip: padding-box;
    }

    .dumpit-desktop ::-webkit-scrollbar-corner {
      background: transparent;
    }

    @media (min-width: 768px) {
      .dumpit-desktop-home body {
        overflow-y: auto;
      }

      .dumpit-desktop-home main.min-h-screen,
      .dumpit-desktop-home .min-h-screen > main {
        padding-top: 2.25rem !important;
        padding-bottom: 2.25rem !important;
      }

      .dumpit-desktop-home main img[alt*="덤핏"] {
        width: 13rem !important;
      }

      .dumpit-desktop-home main img[alt*="덤핏"] + p {
        margin-top: 0.75rem !important;
        font-size: 1rem !important;
      }

      .dumpit-desktop-home main > div:first-child {
        margin-bottom: 1.5rem !important;
      }

      .dumpit-desktop-home main .max-w-xl {
        margin-bottom: 2rem !important;
        font-size: 0.95rem !important;
        line-height: 1.55 !important;
      }

      .dumpit-desktop-home main .max-w-xl .text-2xl {
        font-size: 1.35rem !important;
        margin-top: 0.75rem !important;
        margin-bottom: 0.75rem !important;
      }

      .dumpit-desktop-home main .grid {
        margin-top: 2.5rem !important;
        gap: 0.875rem !important;
      }

      .dumpit-desktop-home main .card-kitschy {
        padding: 1rem !important;
      }
    }
  `
  document.head.appendChild(style)
})
