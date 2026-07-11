import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import DeadlineNudgeMenu from '../DeadlineNudgeMenu'
import useAiUsage from '../../hooks/useAiUsage'
import remainAiToken from '../../assets/remain_ai_token.png'
import coinImage from '../../assets/coin_image.png'
import menuImage from '../../assets/menu.png'

const NAV_ITEMS = [
  { label: '대시보드', path: '/dashboard' },
  { label: '브레인 덤프', path: '/brain-dump' },
  { label: '아이디어 덤프', path: '/ideas' },
  { label: '루틴', path: '/routines' },
  { label: '마이페이지', path: '/mypage' },
]

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

export default function Header({ onOpenDrawer }) {
  const { pathname } = useLocation()
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
    <header className="sticky top-0 z-50 bg-card border-b border-line">
      <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Hamburger button - only below lg */}
          <button
            onClick={onOpenDrawer}
            className="min-[1100px]:hidden w-9 h-9 rounded-lg border border-line flex items-center justify-center hover:bg-chip transition-colors"
            aria-label="메뉴 열기"
          >
            <img src={menuImage} alt="" className="h-5 w-5 object-contain" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/text_logo.webp" alt="덤핏" className="h-24 w-auto" />
            <span className="chip-retro text-secondary">BETA</span>
          </Link>
        </div>

        <nav className="hidden min-[1100px]:flex items-center gap-1">
          {NAV_ITEMS.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className={`px-4 py-2 rounded-lg font-galmuri font-bold text-sm transition-all ${
                pathname === path
                  ? 'bg-chip text-dark'
                  : 'text-sub hover:text-dark hover:bg-chip'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <DeadlineNudgeMenu />
          </div>

          {/* AI usage badge */}
          {usage && (
            <div
              className="group relative hidden sm:flex items-center gap-1.5 bg-chip border border-line rounded-full px-3 py-1 cursor-default select-none"
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
                  <p className="text-[11px] font-bold text-sub mt-0.5">
                    남은 사용량:{' '}
                    <span className={usage.remaining === 0 ? 'text-primary' : 'text-dark'}>
                      {usage.remaining}
                    </span>{' '}
                    / {usage.limit}
                  </p>
                </div>
                <div className="px-3 py-2 border-b border-line">
                  <p className="text-[10px] font-semibold text-sub leading-relaxed">
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
                  <p className="text-[10px] font-semibold text-sub">매일 자정(KST)에 초기화돼요.</p>
                </div>
              </div>
            </div>
          )}

          {/* Coin badge */}
          <div
            className={`group relative hidden sm:flex items-center gap-1.5 bg-chip border border-line rounded-full px-3 py-1 cursor-default select-none ${coinPop ? 'coin-bounce' : ''}`}
            tabIndex={0}
            aria-label="보유 코인 안내"
          >
            <img src={coinImage} alt="coin" className="w-4 h-4 object-contain" />
            <span className="font-dungeon text-sm text-dark leading-none">{displayCoins}</span>
            <div className="pointer-events-none absolute right-0 top-10 z-50 w-64 rounded-lg card-retro px-3 py-2 text-left text-xs font-bold text-sub opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
              추후 열릴 코인샵에서 다양한 테마와 스티커 등을 교환할 수 있어요.
            </div>
          </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
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
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-line bg-accent px-2 py-2 text-center">
                        <img src={coinImage} alt="" className="w-5 h-5 object-contain mx-auto mb-1" />
                        <p className="text-[10px] font-black text-sub">코인</p>
                        <p className="font-dungeon text-sm text-dark">{user?.coins ?? 0}</p>
                      </div>
                      <div className="rounded-lg border border-line bg-chip px-2 py-2 text-center">
                        <img src={remainAiToken} alt="" className="w-5 h-5 object-contain mx-auto mb-1" />
                        <p className="text-[10px] font-black text-sub">AI</p>
                        <p className={`font-dungeon text-sm ${usage?.remaining === 0 ? 'text-primary' : 'text-dark'}`}>
                          {usage ? usage.remaining : '-'}
                        </p>
                      </div>
                      <DeadlineNudgeMenu variant="mobile-card" />
                    </div>
                    {usage && (
                      <p className="mt-2 text-[10px] font-semibold text-sub text-right">
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
