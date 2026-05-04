const { app, BrowserWindow, protocol, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { pathToFileURL } = require('node:url')

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
  protocol.handle('app', (request) => {
    const parsed = new URL(request.url)

    if (parsed.hostname !== APP_HOST) {
      return new Response('Not found', { status: 404 })
    }

    return fetch(pathToFileURL(resolveFrontendFile(request.url)).toString())
  })
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 700,
    title: 'Dumpit',
    backgroundColor: '#fff7e8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

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
  registerFrontendProtocol()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
