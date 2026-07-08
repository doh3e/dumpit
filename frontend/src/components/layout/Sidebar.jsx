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
  { label: '마이페이지', path: '/mypage' },
]

export default function Sidebar({ onOpenSettings, onOpenHelp, tasks, focusRecommendation, isDrawerOpen, onCloseDrawer }) {
  const { user } = useAuth()
  const handleNavClick = () => {
    if (onCloseDrawer) onCloseDrawer()
  }

  const sidebarContent = (
    <>
      <Link
        to="/dashboard"
        onClick={handleNavClick}
        className="flex items-center justify-center mb-4 px-2"
      >
        <img src="/logo.png" alt="덤핏" className="h-36 w-auto" />
      </Link>

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
      <aside className="hidden lg:flex flex-col w-56 min-h-full bg-card border-r border-line pt-6 pb-10 px-3 gap-1">
        {sidebarContent}
      </aside>

      {/* Mobile drawer (below lg) */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[55]" onClick={onCloseDrawer}>
          <div className="absolute inset-0 overlay-retro" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-line pt-6 pb-10 px-3 flex flex-col gap-1 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
