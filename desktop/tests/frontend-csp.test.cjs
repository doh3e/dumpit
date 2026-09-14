const assert = require('node:assert/strict')
const test = require('node:test')

const {
  NOTIFICATION_SHIM_PATHNAME,
  buildFrontendCsp,
  collectInlineScriptHashes,
  injectNotificationShim,
  isNotificationShimPathname,
  prepareFrontendHtml,
} = require('../electron/frontend-csp.cjs')

const BOOTSTRAP_HASH = 'sha256-kFBjnzNP3hjRS7sUmvM4qTWdXDP9Nwxr5j5lMqeJi6o='

test('CSP가 신뢰된 API와 번들 inline 해시만 허용한다', () => {
  const csp = buildFrontendCsp({
    inlineScriptHashes: [BOOTSTRAP_HASH],
    apiOrigin: 'https://api.dumpit.kr',
  })

  assert.equal(csp, [
    "default-src 'self'",
    `script-src 'self' '${BOOTSTRAP_HASH}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    "connect-src 'self' https://api.dumpit.kr https://*.sentry.io",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'none'",
  ].join('; ') + ';')
  assert.doesNotMatch(csp, /script-src[^;]*(?:'unsafe-inline'|'unsafe-eval'|\s\*)/)
})

test('번들의 LF와 CRLF inline script가 브라우저와 같은 해시를 만든다', () => {
  const inlineBody = 'window.theme = "dark"\nwindow.font = 1'
  const lfHtml = `<html><head><script>${inlineBody}</script></head></html>`
  const crlfHtml = lfHtml.replaceAll('\n', '\r\n')

  assert.deepEqual(collectInlineScriptHashes(lfHtml), [BOOTSTRAP_HASH])
  assert.deepEqual(collectInlineScriptHashes(crlfHtml), [BOOTSTRAP_HASH])
})

test('외부 script는 inline 허용 해시 생성원에서 제외한다', () => {
  const html = '<head><script src="/assets/app.js"></script><script data-src="x">console.log("boot")\n</script></head>'

  assert.deepEqual(collectInlineScriptHashes(html), [
    'sha256-tsUb9X7Z5N6QRqjSZkhTEkDHjPukMkgeMKSvxBzrFOA=',
  ])
})

test('CSP는 기존 LOCAL_API 상수 외 origin과 지시문 주입 해시를 거부한다', () => {
  assert.throws(
    () => buildFrontendCsp({ inlineScriptHashes: [], apiOrigin: 'https://example.com' }),
    /허용되지 않은 API origin/,
  )
  assert.throws(
    () => buildFrontendCsp({ inlineScriptHashes: ["sha256-x'; script-src *"], apiOrigin: 'https://api.dumpit.kr' }),
    /올바르지 않은 inline script hash/,
  )

  const localCsp = buildFrontendCsp({ inlineScriptHashes: [], apiOrigin: 'http://localhost:8080' })
  assert.match(localCsp, /connect-src 'self' http:\/\/localhost:8080 https:\/\/\*\.sentry\.io/)
})

test('notification shim을 head 끝에서 module 실행보다 먼저 로드한다', () => {
  const html = '<!doctype html><html><head><script type="module" src="/assets/app.js"></script></head><body></body></html>'
  const injected = injectNotificationShim(html)
  const shimTag = `<script src="${NOTIFICATION_SHIM_PATHNAME}"></script>`

  assert.equal(injected.match(new RegExp(NOTIFICATION_SHIM_PATHNAME.replaceAll('/', '\\/'), 'g')).length, 1)
  assert.ok(injected.indexOf('<script type="module"') < injected.indexOf(shimTag))
  assert.ok(injected.indexOf(shimTag) < injected.indexOf('</head>'))
})

test('예상 head가 없는 HTML은 정책 완화 없이 실패한다', () => {
  assert.throws(
    () => injectNotificationShim('<html><body>broken bundle</body></html>'),
    /head 종료 태그/,
  )
})

test('notification shim 파일은 정확한 고정 app 경로에만 매핑한다', () => {
  assert.equal(isNotificationShimPathname('/_desktop/notification-shim.js'), true)
  assert.equal(isNotificationShimPathname('/_desktop/notification-shim.js/extra'), false)
  assert.equal(isNotificationShimPathname('/assets/notification-shim.js'), false)
})

test('HTML 응답 준비가 bootstrap을 보존하고 shim과 일치하는 CSP를 함께 만든다', () => {
  const html = '<!doctype html><html><head><script>window.theme = "dark"\nwindow.font = 1</script><script type="module" src="/assets/app.js"></script></head><body></body></html>'

  const prepared = prepareFrontendHtml(html, { apiOrigin: 'https://api.dumpit.kr' })

  assert.match(prepared.html, /<script>window\.theme = "dark"\nwindow\.font = 1<\/script>/)
  assert.match(prepared.html, /<script src="\/_desktop\/notification-shim\.js"><\/script><\/head>/)
  assert.match(prepared.contentSecurityPolicy, new RegExp(`script-src 'self' '${BOOTSTRAP_HASH}'`))
})
