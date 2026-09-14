const crypto = require('node:crypto')

const ALLOWED_API_ORIGINS = new Set([
  'https://api.dumpit.kr',
  'http://localhost:8080',
])
const NOTIFICATION_SHIM_PATHNAME = '/_desktop/notification-shim.js'
const SHA256_SOURCE_PATTERN = /^sha256-[A-Za-z0-9+/]{43}=$/

function normalizeBrowserScriptText(source) {
  return source.replace(/\r\n?/g, '\n')
}

function hasSrcAttribute(attributes) {
  const namesOnly = attributes.replace(/"[^"]*"|'[^']*'/g, '')
  return /(?:^|\s)src(?:\s|=|$)/i.test(namesOnly)
}

function collectInlineScriptHashes(html) {
  const hashes = []
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi

  for (const match of html.matchAll(scriptPattern)) {
    if (hasSrcAttribute(match[1])) continue

    const scriptText = normalizeBrowserScriptText(match[2])
    const digest = crypto.createHash('sha256').update(scriptText, 'utf8').digest('base64')
    hashes.push(`sha256-${digest}`)
  }

  return hashes
}

function buildFrontendCsp({ inlineScriptHashes, apiOrigin }) {
  if (!ALLOWED_API_ORIGINS.has(apiOrigin)) {
    throw new Error(`허용되지 않은 API origin: ${apiOrigin}`)
  }
  if (!Array.isArray(inlineScriptHashes)) {
    throw new TypeError('inline script hashes는 배열이어야 합니다.')
  }

  const scriptSources = inlineScriptHashes.map((hash) => {
    if (typeof hash !== 'string' || !SHA256_SOURCE_PATTERN.test(hash)) {
      throw new Error('올바르지 않은 inline script hash입니다.')
    }
    return `'${hash}'`
  })

  return [
    "default-src 'self'",
    ["script-src 'self'", ...scriptSources].join(' '),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    `connect-src 'self' ${apiOrigin} https://*.sentry.io`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'none'",
  ].join('; ') + ';'
}

function injectNotificationShim(html) {
  const closingHead = /<\/head\s*>/i
  if (!closingHead.test(html)) {
    throw new Error('번들 HTML에 head 종료 태그가 없습니다.')
  }

  const scriptTag = `<script src="${NOTIFICATION_SHIM_PATHNAME}"></script>`
  return html.replace(closingHead, `${scriptTag}</head>`)
}

function isNotificationShimPathname(pathname) {
  return pathname === NOTIFICATION_SHIM_PATHNAME
}

function prepareFrontendHtml(html, { apiOrigin }) {
  const inlineScriptHashes = collectInlineScriptHashes(html)
  return {
    html: injectNotificationShim(html),
    contentSecurityPolicy: buildFrontendCsp({ inlineScriptHashes, apiOrigin }),
  }
}

module.exports = {
  NOTIFICATION_SHIM_PATHNAME,
  buildFrontendCsp,
  collectInlineScriptHashes,
  injectNotificationShim,
  isNotificationShimPathname,
  prepareFrontendHtml,
}
