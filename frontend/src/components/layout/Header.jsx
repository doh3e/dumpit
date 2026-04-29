import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import DeadlineNudgeMenu from '../DeadlineNudgeMenu'
import useAiUsage from '../../hooks/useAiUsage'

const NAV_ITEMS = [
  { label: '대시보드', path: '/dashboard' },
  { label: '브레인 덤프', path: '/brain-dump' },
  { label: '아이디어 덤프', path: '/ideas' },
  { label: '루틴', path: '/routines' },
]

const AI_COST_ROWS = [
  ['일일 총 한도', '100점', true],
  ['태스크 추가 및 AI 분석', '1점', false],
  ['우선순위 재분석', '1점', false],
  ['서브태스크 제안', '3점', false],
  ['브레인 덤프 분석', '5점', false],
  ['그 외 모든 활동', '무료', false],
]

export default function Header({ onOpenDrawer }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { usage } = useAiUsage()

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
    ? 'text-white/60'
    : usage.remaining >= 50
    ? 'text-white'
    : usage.remaining >= 20
    ? 'text-yellow-200'
    : 'text-red-200'

  return (
    <header className="sticky top-0 z-50 bg-primary border-b-2 border-dark shadow-kitschy">
      <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Hamburger button - only below lg */}
          <button
            onClick={onOpenDrawer}
            className="lg:hidden w-9 h-9 rounded-lg border-2 border-white text-white flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
            aria-label="메뉴 열기"
          >
            <span className="block w-4 h-0.5 bg-white" />
            <span className="block w-4 h-0.5 bg-white" />
            <span className="block w-4 h-0.5 bg-white" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/text_logo.png" alt="DumpIt" className="h-24 w-auto" />
            <span className="text-[10px] font-bold bg-secondary text-white px-2 py-0.5 rounded border border-dark">
              BETA
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                pathname === path
                  ? 'bg-dark text-white border-dark'
                  : 'text-white border-transparent hover:border-white hover:bg-white/10'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <DeadlineNudgeMenu />

          {/* AI usage badge */}
          {usage && (
            <div
              className="group relative hidden sm:flex items-center gap-1.5 bg-white/25 border-2 border-white/80 rounded-full px-3 py-1 cursor-default select-none"
              tabIndex={0}
              aria-label="AI 사용량 안내"
            >
              <span className="text-xs text-white leading-none">⚡</span>
              <span className={`text-sm font-extrabold leading-none ${aiColor}`}>
                {usage.remaining}
              </span>

              <div className="pointer-events-none absolute right-0 top-10 z-50 w-72 rounded-lg border-2 border-dark bg-white shadow-kitschy text-left opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                <div className="px-3 py-2.5 border-b border-dark/10">
                  <p className="text-xs font-black text-dark">⚡ AI 사용량 (오늘)</p>
                  <p className="text-[11px] font-bold text-dark/50 mt-0.5">
                    남은 사용량:{' '}
                    <span className={usage.remaining === 0 ? 'text-primary' : 'text-dark'}>
                      {usage.remaining}
                    </span>{' '}
                    / {usage.limit}
                  </p>
                </div>
                <div className="px-3 py-2 border-b border-dark/10">
                  <p className="text-[10px] font-semibold text-dark/50 leading-relaxed">
                    Dumpit!은 베타 서비스 중이에요. 모든 활동이 무료인 대신
                    AI 기능에는 일일 사용량 제한이 있어요.
                  </p>
                </div>
                {AI_COST_ROWS.map(([label, cost, isTotal]) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between px-3 py-1.5 border-b border-dark/5 last:border-0 ${
                      isTotal ? 'bg-dark/5' : ''
                    }`}
                  >
                    <span className={`text-xs ${isTotal ? 'font-black text-dark' : 'font-semibold text-dark/70'}`}>
                      {label}
                    </span>
                    <span className="text-xs font-black text-dark">{cost}</span>
                  </div>
                ))}
                <div className="px-3 py-2 border-t border-dark/10">
                  <p className="text-[10px] font-semibold text-dark/40">매일 자정(KST)에 초기화돼요.</p>
                </div>
              </div>
            </div>
          )}

          {/* Coin badge */}
          <div
            className="group relative hidden sm:flex items-center gap-1.5 bg-white/25 border-2 border-white/80 rounded-full px-3 py-1 cursor-default select-none"
            tabIndex={0}
            aria-label="보유 코인 안내"
          >
            <span className="text-xs text-white leading-none">🪙</span>
            <span className="text-sm font-extrabold text-white leading-none">{user?.coins ?? 0}</span>
            <div className="pointer-events-none absolute right-0 top-10 z-50 w-64 rounded-lg border-2 border-dark bg-white px-3 py-2 text-left text-xs font-bold text-dark/70 opacity-0 shadow-kitschy transition-opacity group-hover:opacity-100 group-focus:opacity-100">
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
                className="w-9 h-9 rounded-full border-2 border-dark shadow-kitschy object-cover cursor-pointer"
              />
            ) : (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-full bg-accent border-2 border-dark shadow-kitschy font-bold text-dark text-sm"
              >
                {user?.name?.[0] ?? '?'}
              </button>
            )}

            {menuOpen && (
              <div className="absolute right-0 top-12 z-50">
                <div className="card-kitschy py-2 min-w-[160px]">
                  <p className="px-4 py-1 text-xs font-bold text-dark/50 truncate">{user?.email}</p>
                  <hr className="my-1 border-dark/10" />
                  <button
                    onClick={() => { setMenuOpen(false); logout() }}
                    className="w-full text-left px-4 py-2 text-sm font-bold text-dark hover:bg-primary hover:text-white rounded transition-colors"
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
