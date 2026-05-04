const {
  app,
  BrowserWindow,
  dialog,
  Menu,
  Notification,
  Tray,
  ipcMain,
  protocol,
  screen,
  session,
  shell,
} = require('electron')
const path = require('node:path')
const fs = require('node:fs')

app.setName('덤핏(Dumpit!)')
app.setPath('userData', path.join(app.getPath('appData'), 'Dumpit'))

const APP_HOST = 'dumpit'
const APP_URL = `app://${APP_HOST}`
const DESKTOP_ZOOM_FACTOR = 0.90
const AUTH_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30
const SESSION_COOKIE_NAMES = new Set(['JSESSIONID', 'SESSION'])
const WEB_APP_ORIGINS = new Set([
  'https://dumpit.kr',
  'https://www.dumpit.kr',
  'http://localhost:5173',
])
const AUTH_NAVIGATION_HOSTS = new Set([
  'api.dumpit.kr',
  'accounts.google.com',
  'oauth2.googleapis.com',
])
const isDev = !app.isPackaged
const isDebug = process.env.DUMPIT_DESKTOP_DEBUG === '1'
let mainWindow
let tray
let isQuitting = false
let preferences = {
  skipCloseToTrayPrompt: false,
}
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.on('second-instance', () => {
  showMainWindow()
})

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
    },
  },
])

function toAppUrl(url) {
  const parsed = new URL(url)
  return `${APP_URL}${parsed.pathname}${parsed.search}${parsed.hash}`
}

function shouldKeepAuthNavigationInApp(url) {
  const parsed = new URL(url)
  return parsed.protocol === 'https:' && AUTH_NAVIGATION_HOSTS.has(parsed.hostname)
}

function handleNavigation(mainWindow, url) {
  if (url.startsWith(APP_URL)) return false

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    shell.openExternal(url)
    return true
  }

  if (WEB_APP_ORIGINS.has(parsed.origin)) {
    mainWindow.loadURL(toAppUrl(url))
    return true
  }

  if (shouldKeepAuthNavigationInApp(url)) {
    return false
  }

  shell.openExternal(url)
  return true
}

function getFrontendDistPath() {
  return isDev
    ? path.resolve(__dirname, '..', '..', 'frontend', 'dist')
    : path.join(app.getAppPath(), 'frontend-dist')
}

function getAppIconPath() {
  return isDev
    ? path.resolve(__dirname, '..', 'assets', 'icons', 'app.ico')
    : path.join(app.getAppPath(), 'assets', 'icons', 'app.ico')
}

function getTrayIconPath() {
  return isDev
    ? path.resolve(__dirname, '..', 'assets', 'icons', 'tray.ico')
    : path.join(app.getAppPath(), 'assets', 'icons', 'tray.ico')
}

function getPreferencesPath() {
  return path.join(app.getPath('userData'), 'preferences.json')
}

function loadPreferences() {
  try {
    preferences = {
      ...preferences,
      ...JSON.parse(fs.readFileSync(getPreferencesPath(), 'utf8')),
    }
  } catch {
    preferences = { ...preferences }
  }
}

function savePreferences() {
  fs.mkdirSync(app.getPath('userData'), { recursive: true })
  fs.writeFileSync(getPreferencesPath(), JSON.stringify(preferences, null, 2))
}

function resolveFrontendFile(url) {
  const distPath = getFrontendDistPath()
  const parsed = new URL(url)
  const requestedPath = decodeURIComponent(parsed.pathname)
  const candidate = path.normalize(path.join(distPath, requestedPath))
  const relativePath = path.relative(distPath, candidate)

  if (
    relativePath &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath) &&
    fs.existsSync(candidate) &&
    fs.statSync(candidate).isFile()
  ) {
    return candidate
  }

  return path.join(distPath, 'index.html')
}

function registerFrontendProtocol() {
  protocol.handle('app', async (request) => {
    const parsed = new URL(request.url)

    if (parsed.hostname !== APP_HOST) {
      return new Response('Not found', { status: 404 })
    }

    const filePath = resolveFrontendFile(request.url)
    const fileBuffer = await fs.promises.readFile(filePath)
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'

    return new Response(fileBuffer, {
      headers: {
        'content-type': contentType,
      },
    })
  })
}

function createApplicationMenu(mainWindow) {
  const template = [
    {
      label: '덤핏',
      submenu: [
        {
          label: '덤핏 열기',
          click: () => {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
          },
        },
        { type: 'separator' },
        {
          label: '홈으로 이동',
          click: () => mainWindow.loadURL(`${APP_URL}/`),
        },
        { type: 'separator' },
        {
          label: '종료',
          role: 'quit',
        },
      ],
    },
    {
      label: '보기',
      submenu: [
        {
          label: '새로고침',
          role: 'reload',
        },
        {
          label: '확대',
          role: 'zoomIn',
        },
        {
          label: '축소',
          role: 'zoomOut',
        },
        {
          label: '기본 크기',
          click: () => mainWindow?.webContents.setZoomFactor(DESKTOP_ZOOM_FACTOR),
        },
        { type: 'separator' },
        {
          label: '전체 화면',
          role: 'togglefullscreen',
        },
      ],
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '덤핏 웹사이트 열기',
          click: () => shell.openExternal('https://dumpit.kr'),
        },
        {
          label: '문의 메일 보내기',
          click: () => shell.openExternal('mailto:dumpitadmin@gmail.com'),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function showMainWindow(url) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createWindow()
  }

  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()

  if (url && !mainWindow.webContents.isLoading()) {
    mainWindow.loadURL(url)
  }
}

function openSettingsFromTray() {
  showMainWindow(`${APP_URL}/dashboard`)

  const sendOpenSettings = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('dumpit:open-settings')
    }
  }

  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', sendOpenSettings)
  } else {
    setTimeout(sendOpenSettings, 150)
  }
}

function createTray() {
  if (tray) return tray

  tray = new Tray(getTrayIconPath())
  tray.setToolTip('덤핏(Dumpit!)')
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '덤핏 열기',
      click: () => showMainWindow(),
    },
    {
      label: '대시보드 열기',
      click: () => showMainWindow(`${APP_URL}/dashboard`),
    },
    {
      label: '루틴 열기',
      click: () => showMainWindow(`${APP_URL}/routines`),
    },
    {
      label: '설정 열기',
      click: () => openSettingsFromTray(),
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ]))
  tray.on('double-click', () => showMainWindow())

  return tray
}

function updateTrayPomodoro(payload = {}) {
  if (!tray) return

  const modeLabel = payload.mode === 'BREAK' ? '휴식' : '집중'
  const timeLabel = typeof payload.time === 'string' ? payload.time : '--:--'
  const stateLabel = payload.running ? '진행 중' : '일시정지'
  tray.setToolTip(`Dumpit\n뽀모도로 ${modeLabel} ${timeLabel} · ${stateLabel}`)
}

function persistAuthSessionCookies() {
  session.defaultSession.cookies.on('changed', (_event, cookie, cause, removed) => {
    const domain = cookie.domain?.replace(/^\./, '')
    const isDumpitSession = SESSION_COOKIE_NAMES.has(cookie.name)
      && domain?.endsWith('dumpit.kr')
      && cookie.session
      && !removed
      && cause !== 'overwrite'

    if (!isDumpitSession) return

    const cookiePath = cookie.path || '/api'
    const cookieUrl = `https://${domain}${cookiePath}`
    const cookieDetails = {
      url: cookieUrl,
      name: cookie.name,
      value: cookie.value,
      path: cookiePath,
      secure: true,
      httpOnly: cookie.httpOnly,
      sameSite: 'no_restriction',
      expirationDate: Math.floor(Date.now() / 1000) + AUTH_COOKIE_TTL_SECONDS,
    }

    session.defaultSession.cookies.set(cookieDetails)
      .then(() => session.defaultSession.flushStorageData())
      .then(() => {
        if (isDebug) {
          console.log(`[desktop] persisted ${cookie.name} for ${domain}`)
        }
      })
      .catch((error) => {
        if (isDebug) {
          console.warn(`[desktop] failed to persist ${cookie.name} for ${domain}`, error)
        }
      })
  })
}

async function removeLegacyAuthCookies() {
  const cookies = await session.defaultSession.cookies.get({ url: 'https://api.dumpit.kr/api' })
  await Promise.all(cookies
    .filter((cookie) => SESSION_COOKIE_NAMES.has(cookie.name) && cookie.domain?.startsWith('.'))
    .map((cookie) => session.defaultSession.cookies.remove(
      `https://${cookie.domain.replace(/^\./, '')}${cookie.path || '/api'}`,
      cookie.name
    ).catch(() => {})))
}

function debugApiCookieHeaders() {
  if (!isDebug) return

  session.defaultSession.webRequest.onCompleted(
    { urls: ['https://api.dumpit.kr/api/*'] },
    (details) => {
      console.log(`[desktop] api response ${details.statusCode} ${details.method} ${details.url}`)
    }
  )

  session.defaultSession.webRequest.onErrorOccurred(
    { urls: ['https://api.dumpit.kr/api/*'] },
    (details) => {
      console.log(`[desktop] api error ${details.error} ${details.method} ${details.url}`)
    }
  )
}

function allowApiCorsForDesktopApp() {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://api.dumpit.kr/api/*'] },
    (details, callback) => {
      const requestHeaders = {
        ...details.requestHeaders,
        Origin: 'https://dumpit.kr',
        Referer: 'https://dumpit.kr/',
      }

      if (isDebug) {
        const cookieHeader = requestHeaders.Cookie || requestHeaders.cookie || ''
        console.log(`[desktop] api request ${details.method} ${details.url}`)
        console.log(`[desktop] api Cookie header present: ${cookieHeader ? 'yes' : 'no'}`)
      }

      callback({
        requestHeaders,
      })
    }
  )

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['https://api.dumpit.kr/api/*'] },
    (details, callback) => {
      const responseHeaders = Object.fromEntries(
        Object.entries(details.responseHeaders || {})
          .filter(([key]) => !key.toLowerCase().startsWith('access-control-'))
      )

      callback({
        responseHeaders: {
          ...responseHeaders,
        'Access-Control-Allow-Credentials': ['true'],
        'Access-Control-Allow-Headers': ['Content-Type, Authorization, X-Requested-With'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, PATCH, OPTIONS'],
        'Access-Control-Allow-Origin': [APP_URL],
        'Access-Control-Expose-Headers': ['Location'],
        },
      })
    }
  )
}

async function logStoredAuthCookies() {
  if (!isDebug) return

  try {
    const cookies = await session.defaultSession.cookies.get({ url: 'https://api.dumpit.kr/api' })
    const authCookies = cookies
      .filter((cookie) => SESSION_COOKIE_NAMES.has(cookie.name))
      .map((cookie) => ({
        name: cookie.name,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        session: cookie.session,
        expirationDate: cookie.expirationDate,
      }))

    console.log('[desktop] stored auth cookies on startup:', JSON.stringify(authCookies, null, 2))
  } catch (error) {
    console.warn('[desktop] failed to inspect auth cookies on startup', error)
  }
}

function registerNotificationBridge() {
  ipcMain.handle('dumpit:notify', (event, payload = {}) => {
    const title = String(payload.title || '덤핏(Dumpit!)')
    const body = typeof payload.body === 'string' ? payload.body : undefined
    const clickUrl = typeof payload.clickUrl === 'string' ? payload.clickUrl : undefined
    const notification = new Notification({
      title,
      body,
      icon: getAppIconPath(),
      silent: Boolean(payload.silent),
    })

    notification.on('click', () => {
      showMainWindow()
      if (clickUrl) {
        event.sender.send('dumpit:notification-click', {
          id: payload.id,
          clickUrl,
        })
      }
    })

    notification.show()
    return true
  })

  ipcMain.on('dumpit:pomodoro-state', (_event, payload) => {
    updateTrayPomodoro(payload)
  })
}

function createWindow() {
  const { workAreaSize } = screen.getPrimaryDisplay()
  const initialWidth = Math.min(1280, workAreaSize.width)
  const initialHeight = Math.min(1000, workAreaSize.height)

  const createdWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: 960,
    minHeight: 820,
    title: '덤핏(Dumpit!)',
    icon: getAppIconPath(),
    backgroundColor: '#fff7e8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  createApplicationMenu(createdWindow)

  createdWindow.webContents.on('did-finish-load', () => {
    createdWindow.webContents.setZoomFactor(DESKTOP_ZOOM_FACTOR)
    createdWindow.setTitle('덤핏(Dumpit!)')
  })

  createdWindow.on('page-title-updated', (event) => {
    event.preventDefault()
  })

  createdWindow.loadURL(`app://${APP_HOST}/`)

  createdWindow.on('close', async (event) => {
    if (isQuitting) return
    event.preventDefault()

    if (!preferences.skipCloseToTrayPrompt) {
      const { response, checkboxChecked } = await dialog.showMessageBox(createdWindow, {
        type: 'question',
        buttons: ['트레이로 내리기', '종료하기'],
        defaultId: 0,
        cancelId: 0,
        title: '덤핏(Dumpit!)',
        message: '덤핏을 종료하지 않고 트레이로 내릴까요?',
        detail: '트레이 아이콘에서 다시 열 수 있어요. 완전히 종료하려면 트레이 메뉴의 종료를 사용할 수 있습니다.',
        checkboxLabel: '다시 묻지 않기',
        checkboxChecked: false,
      })

      if (checkboxChecked) {
        preferences.skipCloseToTrayPrompt = true
        savePreferences()
      }

      if (response === 1) {
        isQuitting = true
        app.quit()
        return
      }
    }

    createdWindow.hide()
  })

  createdWindow.webContents.on('will-navigate', (event, url) => {
    if (handleNavigation(createdWindow, url)) {
      event.preventDefault()
    }
  })

  createdWindow.webContents.on('did-redirect-navigation', (_event, url, _isInPlace, isMainFrame) => {
    if (!isMainFrame) return
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      return
    }
    if (WEB_APP_ORIGINS.has(parsed.origin)) {
      createdWindow.loadURL(toAppUrl(url))
    }
  })

  createdWindow.webContents.setWindowOpenHandler(({ url }) => {
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      shell.openExternal(url)
      return { action: 'deny' }
    }

    if (WEB_APP_ORIGINS.has(parsed.origin)) {
      createdWindow.loadURL(toAppUrl(url))
      return { action: 'deny' }
    }

    if (shouldKeepAuthNavigationInApp(url)) {
      return { action: 'allow' }
    }

    shell.openExternal(url)
    return { action: 'deny' }
  })

  return createdWindow
}

app.whenReady().then(async () => {
  app.setAppUserModelId(isDev ? 'Dumpit!' : 'kr.dumpit.desktop')
  loadPreferences()
  persistAuthSessionCookies()
  debugApiCookieHeaders()
  allowApiCorsForDesktopApp()
  registerNotificationBridge()
  registerFrontendProtocol()
  await removeLegacyAuthCookies()
  await logStoredAuthCookies()
  createTray()
  mainWindow = createWindow()

  app.on('activate', () => {
    showMainWindow()
  })
})

app.on('window-all-closed', () => {
  // Keep the app alive in the tray until the user explicitly quits.
})

app.on('before-quit', () => {
  isQuitting = true
  if (tray) {
    tray.destroy()
    tray = null
  }
})
