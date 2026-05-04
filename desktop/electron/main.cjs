const { app, BrowserWindow, Menu, protocol, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

app.setName('Dumpit')

const APP_HOST = 'dumpit'
const APP_URL = `app://${APP_HOST}`
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
    ? path.resolve(__dirname, '..', '..', 'frontend', 'public', 'favicon-48x48.png')
    : path.join(app.getAppPath(), 'frontend-dist', 'favicon-48x48.png')
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
          role: 'resetZoom',
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

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 700,
    title: 'Dumpit',
    icon: getAppIconPath(),
    backgroundColor: '#fff7e8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  createApplicationMenu(mainWindow)
  mainWindow.loadURL(`app://${APP_HOST}/`)

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (handleNavigation(mainWindow, url)) {
      event.preventDefault()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      shell.openExternal(url)
      return { action: 'deny' }
    }

    if (WEB_APP_ORIGINS.has(parsed.origin)) {
      mainWindow.loadURL(toAppUrl(url))
      return { action: 'deny' }
    }

    if (shouldKeepAuthNavigationInApp(url)) {
      return { action: 'allow' }
    }

    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  app.setAppUserModelId('kr.dumpit.desktop')
  registerFrontendProtocol()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
