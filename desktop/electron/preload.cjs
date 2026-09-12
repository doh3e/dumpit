const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dumpitDesktop', {
  getAppInfo: () => ipcRenderer.invoke('dumpit:app-info'),
  checkForUpdates: () => ipcRenderer.invoke('dumpit:check-for-updates'),
  getLaunchAtLogin: () => ipcRenderer.invoke('dumpit:get-launch-at-login'),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('dumpit:set-launch-at-login', Boolean(enabled)),
  notify: (payload) => ipcRenderer.invoke('dumpit:notify', payload),
  openPomodoroWidget: () => ipcRenderer.send('dumpit:pomodoro-widget-show'),
  updatePomodoroState: (payload) => ipcRenderer.send('dumpit:pomodoro-state', payload),
  onNotificationClick: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('dumpit:notification-click', listener)
    return () => ipcRenderer.removeListener('dumpit:notification-click', listener)
  },
  onPomodoroCommand: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('dumpit:pomodoro-command', listener)
    return () => ipcRenderer.removeListener('dumpit:pomodoro-command', listener)
  },
})

ipcRenderer.on('dumpit:open-settings', () => {
  const buttons = Array.from(document.querySelectorAll('button'))
  const settingsButton = buttons.find((button) => button.textContent?.trim() === '설정')
  settingsButton?.click()
})

function updateDesktopRouteClass() {
  document.documentElement.classList.toggle(
    'dumpit-desktop-home',
    window.location.pathname === '/'
  )
}

// Keep desktop-only presentation tweaks isolated from the shared web app.
window.addEventListener('DOMContentLoaded', () => {
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
