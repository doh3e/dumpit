import { useState, useRef, useEffect, useId } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import DeadlineNudgeMenu from '../DeadlineNudgeMenu'
import useAiUsage from '../../hooks/useAiUsage'
import { iconProps } from '../../assets/icons'

const AI_COST_ROWS = [
  ['일일 총 한도', '100점', true],
  ['태스크 추가 및 AI 분석', '1점', false],
  ['우선순위 재분석', '1점', false],
  ['서브태스크 제안', '3점', false],
  ['브레인 덤프 분석', '5점', false],
  ['아이디어 덤프 분석', '5점', false],
  ['아이디어 → 태스크 변환', '1점', false],
  ['그 외 모든 활동', '무료', false],
]

export default function Header({ onOpenDrawer, onOpenHelp, onOpenSettings }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openResource, setOpenResource] = useState(null)
  const menuRef = useRef(null)
  const resourcesRef = useRef(null)
  const accountMenuId = useId()
  const aiPopoverId = useId()
  const coinPopoverId = useId()
  const { usage, loading } = useAiUsage()

  // 코인 증가 시 배지 바운스 + 숫자 카운트업 (보상 모션 2)
  const coins = user?.coins ?? 0
  const prevCoins = useRef(coins)
  const [displayCoins, setDisplayCoins] = useState(coins)
  const [coinPop, setCoinPop] = useState(false)
  useEffect(() => {
    const from = prevCoins.current
    prevCoins.current = coins
    if (coins === from) { setDisplayCoins(coins); return undefined }
    if (coins < from || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayCoins(coins)
      return undefined
    }
    setCoinPop(true)
    const start = performance.now()
    let raf
    const tick = (now) => {
      const p = Math.min((now - start) / 300, 1)
      setDisplayCoins(Math.round(from + (coins - from) * p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const t = setTimeout(() => setCoinPop(false), 450)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [coins])

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    const handleKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [menuOpen])

  useEffect(() => {
    if (!openResource) return
    const handleClick = (event) => {
      if (resourcesRef.current && !resourcesRef.current.contains(event.target)) {
        setOpenResource(null)
      }
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpenResource(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openResource])

  const toggleResource = (resource) => {
    setMenuOpen(false)
    setOpenResource((current) => current === resource ? null : resource)
  }

  const aiColor = usage === null
    ? 'text-sub'
    : usage.remaining >= 50
    ? 'text-dark'
    : usage.remaining >= 20
    ? 'text-warn'
    : 'text-primary'
  const aiLabel = usage
    ? `AI 잔여량 ${usage.remaining} / ${usage.limit}점 안내`
    : loading
      ? 'AI 잔여량 확인 중'
      : 'AI 잔여량 확인 불가'

  return (
    <header className="app-header sticky top-0 z-50 bg-chrome border-b border-chrome-line">
      <div className="header-refined-inner">
        <div className="header-refined-brand">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="btn-refined btn-refined-text header-refined-icon-button lg:hidden"
            aria-label="메뉴 열기"
          >
            <img {...iconProps('menu', 20)} alt="" className="h-5 w-5 object-contain" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            {/* 투명 여백 트리밍된 로고 — 바(h-20)를 넘지 않게 */}
            {/* 서비스명은 모든 폭에서 보여야 하므로 유체 축소 대신 md 기준 두 단계 고정 크기 */}
            {/* srcset: 표시 크기별 사전 리사이즈본 — 브라우저 대비율 축소로 생기던 계단 현상 방지 (scripts/gen_logo_sizes.py) */}
            <img
              src="/text_logo.webp"
              srcSet="/text_logo_106.webp 106w, /text_logo_141.webp 141w, /text_logo_176.webp 176w, /text_logo_212.webp 212w, /text_logo_282.webp 282w, /text_logo_423.webp 423w"
              sizes="(min-width: 768px) 141px, 106px"
              alt="덤핏"
              className="h-9 md:h-12 w-auto"
            />
            <span className="chip-retro text-secondary shrink-0 hidden md:inline-block">BETA</span>
          </Link>
        </div>

        <div className="header-refined-actions">
          <div className="header-refined-deadline hidden sm:block shrink-0">
            <DeadlineNudgeMenu />
          </div>

          <button
            type="button"
            onClick={() => onOpenHelp?.()}
            className="btn-refined btn-refined-text header-refined-icon-button hidden lg:flex font-black text-sub"
            aria-label="도움말"
            title="도움말"
          >
            ?
          </button>
          <button
            type="button"
            onClick={() => onOpenSettings?.()}
            className="btn-refined btn-refined-text header-refined-icon-button hidden lg:flex"
            aria-label="설정"
            title="설정"
          >
            <img {...iconProps('setting', 20)} alt="" className="h-5 w-5 object-contain" />
          </button>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setOpenResource(null)
                setMenuOpen((current) => !current)
              }}
              aria-controls={menuOpen ? accountMenuId : undefined}
              aria-expanded={menuOpen}
              aria-label="계정 메뉴"
              className="btn-refined header-refined-account-button rounded-full overflow-hidden font-bold text-sm"
            >
              {user?.picture
                ? <img src={user.picture} alt="" className="w-full h-full object-cover" />
                : (user?.name?.[0] ?? '?')}
            </button>

            {menuOpen && (
              <div id={accountMenuId} className="header-refined-account-menu">
                <div className="card-retro py-2 sm:min-w-[160px]">
                  <div className="sm:hidden px-3 pb-2 mb-2 border-b border-line">
                    <div>
                      <DeadlineNudgeMenu variant="mobile-card" />
                    </div>
                  </div>
                  <p className="px-4 py-1 text-xs font-bold text-sub truncate">{user?.email}</p>
                  <hr className="my-1 border-line" />
                  <Link
                    to="/mypage"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-bold text-dark hover:bg-chip rounded transition-colors"
                  >
                    마이페이지
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); logout() }}
                    className="w-full text-left px-4 py-2 text-sm font-bold text-dark hover:bg-chip rounded transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="header-refined-resources" ref={resourcesRef}>
          <button
            type="button"
            className="btn-refined header-refined-resource-button"
            aria-label={aiLabel}
            aria-expanded={openResource === 'ai'}
            aria-controls={aiPopoverId}
            onClick={() => toggleResource('ai')}
          >
            <img {...iconProps('token', 16)} alt="" className="h-4 w-4 shrink-0 object-contain" />
            <span className="text-xs text-sub">{usage ? 'AI 잔여 ' : 'AI '}</span>
            <span className={`font-dungeon leading-none ${aiColor}`}>
              {usage ? `${usage.remaining} / ${usage.limit}` : '—'}
            </span>
          </button>

          <button
            type="button"
            className={`btn-refined header-refined-resource-button ${coinPop ? 'coin-bounce' : ''}`}
            aria-label={`보유 코인 ${displayCoins}개 안내`}
            aria-expanded={openResource === 'coin'}
            aria-controls={coinPopoverId}
            onClick={() => toggleResource('coin')}
          >
            <img {...iconProps('coin', 16)} alt="" className="h-4 w-4 shrink-0 object-contain" />
            <span className="text-xs text-sub">코인</span>
            <span className="font-dungeon text-dark leading-none">{displayCoins}</span>
          </button>

          {openResource === 'ai' && (
            <div id={aiPopoverId} className="surface-refined header-refined-popover text-left">
              <div className="px-3 py-2.5 border-b border-line">
                <p className="text-xs font-black text-dark">AI 잔여량 (오늘)</p>
                <p className="mt-0.5 text-[0.6875rem] font-bold text-sub">
                  {usage
                    ? <><span className={usage.remaining === 0 ? 'text-primary' : 'text-dark'}>{usage.remaining}</span> / {usage.limit}점</>
                    : loading ? '확인 중이에요.' : '현재 확인할 수 없어요.'}
                </p>
              </div>
              <div className="px-3 py-2 border-b border-line">
                <p className="text-[0.625rem] font-semibold text-sub leading-relaxed">
                  Dumpit!은 베타 서비스 중이에요. 모든 활동이 무료인 대신
                  AI 기능에는 일일 사용량 제한이 있어요.
                </p>
              </div>
              {AI_COST_ROWS.map(([label, cost, isTotal]) => (
                <div
                  key={label}
                  className={`flex items-center justify-between px-3 py-1.5 divider-retro last:border-0 ${isTotal ? 'bg-chip' : ''}`}
                >
                  <span className={`text-xs ${isTotal ? 'font-black text-dark' : 'font-semibold text-sub'}`}>{label}</span>
                  <span className="text-xs font-black text-dark">{cost}</span>
                </div>
              ))}
              <div className="px-3 py-2 border-t border-line">
                <p className="text-[0.625rem] font-semibold text-sub">매일 자정(KST)에 초기화돼요.</p>
              </div>
            </div>
          )}

          {openResource === 'coin' && (
            <div id={coinPopoverId} className="surface-refined header-refined-popover px-3 py-3 text-left text-xs font-bold text-sub">
              코인샵에서 각종 테마와 꾸미기 용품, 스티커로 교환할 수 있어요.
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
