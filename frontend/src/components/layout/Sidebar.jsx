import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Link } from 'react-router-dom'
import PomodoroTimer from '../PomodoroTimer'
import { useAuth } from '../../context/AuthContext'
import settingImage from '../../assets/setting_image.png'
import downloadImage from '../../assets/download.png'

const MENU = [
  { label: '대시보드', path: '/dashboard' },
  { label: '브레인 덤프', path: '/brain-dump' },
  { label: '아이디어 덤프', path: '/ideas' },
  { label: '루틴', path: '/routines' },
  { label: '상점', path: '/shop' },
  { label: '마이페이지', path: '/mypage' },
]

export default function Sidebar({ onOpenSettings, onOpenHelp, tasks, focusRecommendation, isDrawerOpen, onCloseDrawer }) {
  const { user } = useAuth()
  const scrollRef = useRef(null)
  const contentRef = useRef(null)
  const [scrollHint, setScrollHint] = useState({ up: false, down: false })

  // 스크롤바를 숨긴 대신, 위/아래에 가려진 메뉴가 있으면 페이드로 알린다
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined

    const update = () => {
      const up = el.scrollTop > 4
      const down = el.scrollHeight - el.scrollTop - el.clientHeight > 4
      setScrollHint((prev) => (prev.up === up && prev.down === down ? prev : { up, down }))
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    if (contentRef.current) observer.observe(contentRef.current)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [])

  const handleNavClick = () => {
    if (onCloseDrawer) onCloseDrawer()
  }

  // 드로어는 Escape로도 닫힌다 (오버레이 클릭·X 버튼과 함께 세 번째 탈출구)
  useEffect(() => {
    if (!isDrawerOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseDrawer?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDrawerOpen, onCloseDrawer])

  // isDrawer: 행성 로고만 드로어에서 생략 (상단바 텍스트 로고와 중복 + 메뉴가 먼저 보이는 게 깔끔)
  const renderSidebarContent = (isDrawer) => (
    <>
      {!isDrawer && (
        <Link
          to="/dashboard"
          onClick={handleNavClick}
          className="flex items-center justify-center mb-4 px-2"
        >
          {/* srcset: h-36(144px) 기준 DPR별 사전 리사이즈본 — 576px 원본의 4배 축소 계단 현상 방지 */}
          <img
            src="/logo.webp"
            srcSet="/logo_144.webp 144w, /logo_180.webp 180w, /logo_216.webp 216w, /logo_288.webp 288w, /logo_432.webp 432w, /logo.webp 576w"
            sizes="144px"
            alt="덤핏"
            className="h-36 w-auto"
          />
        </Link>
      )}

      {MENU.map(({ label, path }) => (
        <NavLink
          key={path}
          to={path}
          onClick={handleNavClick}
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-lg font-galmuri font-bold text-sm transition-all ${
              isActive
                ? 'bg-chip text-dark'
                : 'text-sub hover:text-dark hover:bg-chip'
            }`
          }
        >
          {label}
        </NavLink>
      ))}

      {user?.isAdmin && (
        <NavLink
          to="/admin"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-lg font-galmuri font-bold text-sm transition-all ${
              isActive
                ? 'bg-chip text-secondary'
                : 'text-secondary hover:bg-chip'
            }`
          }
        >
          <img src={settingImage} alt="" className="mr-2 h-5 w-5 flex-shrink-0 object-contain" />
          관리자 페이지
        </NavLink>
      )}

      <div className="mt-4 pt-4 border-t border-line">
        <h4 className="label-retro mx-2 mb-1">
          Pomodoro
        </h4>
        <PomodoroTimer
          tasks={tasks}
          recommendedTaskId={focusRecommendation?.task?.taskId}
          compact
        />
      </div>

      <div className="mt-auto pt-4 border-t border-line flex flex-col gap-1">
        <NavLink
          to="/notices"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `w-full flex items-center px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
              isActive
                ? 'bg-chip text-dark'
                : 'text-sub hover:text-dark hover:bg-chip'
            }`
          }
        >
          공지사항
        </NavLink>
        <button
          onClick={() => { handleNavClick(); onOpenHelp?.() }}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs text-sub hover:text-dark hover:bg-chip transition-all"
        >
          <span className="w-5 h-5 rounded-full border border-line text-xs font-black flex items-center justify-center flex-shrink-0">?</span>
          도움말
        </button>
        <button
          onClick={() => { handleNavClick(); onOpenSettings() }}
          className="w-full flex items-center px-4 py-2.5 rounded-lg font-bold text-xs text-sub hover:text-dark hover:bg-chip transition-all"
        >
          설정
        </button>
        {!window.dumpitDesktop && (
          <>
            <hr className="border-line" />
            <a
              href="https://github.com/doh3e/dumpit/releases/latest/download/dumpit-setup.exe"
              target="_blank"
              rel="noreferrer"
              onClick={handleNavClick}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs text-sub hover:text-dark hover:bg-chip transition-all"
            >
              <img src={downloadImage} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
              데스크탑 앱 다운로드
            </a>
          </>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar (lg+) */}
      {/* sticky: 본문이 길어져도 사이드바(설정·공지 포함)가 화면에 고정, 넘치면 내부 스크롤 */}
      <div className="hidden lg:block relative w-56 shrink-0 sticky top-20 self-start h-[calc(100vh-5rem)]">
        <aside
          ref={scrollRef}
          className="app-sidebar flex flex-col h-full overflow-y-auto scrollbar-none bg-chrome border-r border-chrome-line pt-6 pb-10 px-3"
        >
          <div ref={contentRef} className="flex min-h-full flex-col gap-1">
            {renderSidebarContent(false)}
          </div>
        </aside>
        {/* right-px: 사이드바 우측 보더 위는 덮지 않는다 */}
        <div
          aria-hidden
          className={`pointer-events-none absolute top-0 left-0 right-px h-8 sidebar-fade-top transition-opacity duration-200 ${
            scrollHint.up ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute bottom-0 left-0 right-px h-10 sidebar-fade-bottom transition-opacity duration-200 flex items-end justify-center ${
            scrollHint.down ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="font-dungeon text-xs text-sub leading-none pb-1">▼</span>
        </div>
      </div>

      {/* Mobile drawer (below lg) — body 포털: 본문 컨테이너(z-10) 스태킹 컨텍스트에 갇히면
          상단바(z-50)를 못 덮는다 */}
      {isDrawerOpen && createPortal(
        <div className="lg:hidden fixed inset-0 z-[60]" onClick={onCloseDrawer}>
          <div className="absolute inset-0 overlay-retro" />
          <aside
            className="app-sidebar absolute left-0 top-0 bottom-0 w-64 bg-chrome border-r border-chrome-line pt-6 pb-10 px-3 flex flex-col gap-1 overflow-y-auto scrollbar-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 명시적 닫기 버튼 — 오버레이 클릭만으론 닫는 법을 못 찾는 사용자 대비 */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="label-retro">메뉴</span>
              <button
                onClick={onCloseDrawer}
                className="w-7 h-7 rounded-lg border border-chrome-line font-black text-sub text-xs hover:bg-chrome-line hover:text-dark transition-colors"
                aria-label="메뉴 닫기"
              >
                X
              </button>
            </div>
            {renderSidebarContent(true)}
          </aside>
        </div>,
        document.body
      )}
    </>
  )
}
