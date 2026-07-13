import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import DeadlineNudgeMenu from '../DeadlineNudgeMenu'
import useAiUsage from '../../hooks/useAiUsage'
import remainAiToken from '../../assets/remain_ai_token.png'
import coinImage from '../../assets/coin_image.png'
import menuImage from '../../assets/menu.png'
import settingImage from '../../assets/setting_image.png'

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
  const menuRef = useRef(null)
  const { usage } = useAiUsage()

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
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const aiColor = !usage
    ? 'text-sub'
    : usage.remaining >= 50
    ? 'text-dark'
    : usage.remaining >= 20
    ? 'text-warn'
    : 'text-primary'

  return (
    <header className="app-header sticky top-0 z-50 bg-chrome border-b border-chrome-line">
      {/* 페이지 내비는 사이드바 전담 — 상단바는 로고·배지·도움말·설정·프사만 양끝 정렬 */}
      <div className="w-full px-6 h-20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          {/* Hamburger button - only below lg */}
          <button
            onClick={onOpenDrawer}
            className="lg:hidden w-9 h-9 shrink-0 rounded-lg border border-chrome-line flex items-center justify-center hover:bg-chrome-line transition-colors"
            aria-label="메뉴 열기"
          >
            <img src={menuImage} alt="" className="h-5 w-5 object-contain" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            {/* 투명 여백 트리밍된 로고 — 바(h-20)를 넘지 않게. h-24 시절엔 오버플로+비대칭 여백으로 바가 어긋나 보였음 */}
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

        {/* 배지들은 shrink-0 — 좁아져도 알약이 찌그러지며 숫자가 새어나오지 않게 */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block shrink-0">
            <DeadlineNudgeMenu />
          </div>

          {/* AI usage badge */}
          {usage && (
            <div
              className="group relative hidden sm:flex shrink-0 items-center gap-1.5 bg-chip border border-line rounded-full px-3 py-1 cursor-default select-none"
              tabIndex={0}
              aria-label="AI 사용량 안내"
            >
              <img src={remainAiToken} alt="AI" className="w-4 h-4 object-contain" />
              <span className={`font-dungeon text-sm leading-none ${aiColor}`}>
                {usage.remaining}
              </span>

              <div className="pointer-events-none absolute right-0 top-10 z-50 w-72 rounded-lg card-retro p-0 text-left opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                <div className="px-3 py-2.5 border-b border-line">
                  <p className="text-xs font-black text-dark">AI 사용량 (오늘)</p>
                  <p className="text-[0.6875rem] font-bold text-sub mt-0.5">
                    남은 사용량:{' '}
                    <span className={usage.remaining === 0 ? 'text-primary' : 'text-dark'}>
                      {usage.remaining}
                    </span>{' '}
                    / {usage.limit}
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
                    className={`flex items-center justify-between px-3 py-1.5 divider-retro last:border-0 ${
                      isTotal ? 'bg-chip' : ''
                    }`}
                  >
                    <span className={`text-xs ${isTotal ? 'font-black text-dark' : 'font-semibold text-sub'}`}>
                      {label}
                    </span>
                    <span className="text-xs font-black text-dark">{cost}</span>
                  </div>
                ))}
                <div className="px-3 py-2 border-t border-line">
                  <p className="text-[0.625rem] font-semibold text-sub">매일 자정(KST)에 초기화돼요.</p>
                </div>
              </div>
            </div>
          )}

          {/* Coin badge */}
          <div
            className={`group relative hidden sm:flex shrink-0 items-center gap-1.5 bg-chip border border-line rounded-full px-3 py-1 cursor-default select-none ${coinPop ? 'coin-bounce' : ''}`}
            tabIndex={0}
            aria-label="보유 코인 안내"
          >
            <img src={coinImage} alt="coin" className="w-4 h-4 object-contain" />
            <span className="font-dungeon text-sm text-dark leading-none">{displayCoins}</span>
            <div className="pointer-events-none absolute right-0 top-10 z-50 w-64 rounded-lg card-retro px-3 py-2 text-left text-xs font-bold text-sub opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
              코인샵에서 각종 테마와 꾸미기 용품, 스티커로 교환할 수 있어요.
            </div>
          </div>

          {/* 도움말·설정 — lg 미만은 드로어 하단 메뉴가 담당하므로 상단바에선 숨김 (폭 확보) */}
          <button
            onClick={() => onOpenHelp?.()}
            className="hidden lg:flex w-9 h-9 shrink-0 rounded-lg border border-line items-center justify-center font-black text-sm text-sub hover:text-dark hover:bg-chip transition-colors"
            aria-label="도움말"
            title="도움말"
          >
            ?
          </button>
          <button
            onClick={() => onOpenSettings?.()}
            className="hidden lg:flex w-9 h-9 shrink-0 rounded-lg border border-line items-center justify-center hover:bg-chip transition-colors"
            aria-label="설정"
            title="설정"
          >
            <img src={settingImage} alt="" className="h-5 w-5 object-contain" />
          </button>

          {/* User menu */}
          <div className="relative shrink-0" ref={menuRef}>
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-full border border-line object-cover cursor-pointer"
              />
            ) : (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-full bg-chip border border-line font-bold text-dark text-sm"
              >
                {user?.name?.[0] ?? '?'}
              </button>
            )}

            {menuOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-1rem))] sm:w-auto">
                <div className="card-retro py-2 sm:min-w-[160px]">
                  <div className="sm:hidden px-3 pb-2 mb-2 border-b border-line">
                    {/* 데스크톱 상단바 배지와 동일한 순서: 마감 → AI → 코인 */}
                    <div className="grid grid-cols-3 gap-2">
                      <DeadlineNudgeMenu variant="mobile-card" />
                      <div className="rounded-lg border border-line bg-chip px-2 py-2 text-center">
                        <img src={remainAiToken} alt="" className="w-5 h-5 object-contain mx-auto mb-1" />
                        <p className="text-[0.625rem] font-black text-sub">AI</p>
                        <p className={`font-dungeon text-sm ${usage?.remaining === 0 ? 'text-primary' : 'text-dark'}`}>
                          {usage ? usage.remaining : '-'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-line bg-accent px-2 py-2 text-center">
                        <img src={coinImage} alt="" className="w-5 h-5 object-contain mx-auto mb-1" />
                        <p className="text-[0.625rem] font-black text-sub">코인</p>
                        <p className="font-dungeon text-sm text-dark">{user?.coins ?? 0}</p>
                      </div>
                    </div>
                    {usage && (
                      <p className="mt-2 text-[0.625rem] font-semibold text-sub text-right">
                        AI {usage.remaining} / {usage.limit} · 자정 초기화
                      </p>
                    )}
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
      </div>
    </header>
  )
}
