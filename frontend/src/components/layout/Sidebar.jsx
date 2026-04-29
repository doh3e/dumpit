import { NavLink, Link } from 'react-router-dom'
import PomodoroTimer from '../PomodoroTimer'
import { useAuth } from '../../context/AuthContext'

const MENU = [
  { label: '대시보드', path: '/dashboard' },
  { label: '브레인 덤프', path: '/brain-dump' },
  { label: '아이디어 덤프', path: '/ideas' },
  { label: '루틴', path: '/routines' },
]

export default function Sidebar({ onOpenSettings, onOpenHelp, tasks, isDrawerOpen, onCloseDrawer }) {
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
        <img src="/logo.png" alt="DumpIt" className="h-36 w-auto" />
      </Link>

      {MENU.map(({ label, path }) => (
        <NavLink
          key={path}
          to={path}
          onClick={handleNavClick}
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-lg font-bold text-sm border-2 transition-all ${
              isActive
                ? 'bg-primary text-white border-dark shadow-kitschy'
                : 'text-dark border-transparent hover:bg-accent hover:border-dark'
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
            `flex items-center px-4 py-3 rounded-lg font-bold text-sm border-2 transition-all ${
              isActive
                ? 'bg-secondary text-white border-dark shadow-kitschy'
                : 'text-secondary border-transparent hover:bg-accent hover:border-secondary'
            }`
          }
        >
          ⚙️ 문의 관리
        </NavLink>
      )}

      <div className="mt-4 pt-4 border-t-2 border-dark/20">
        <h4 className="text-[10px] font-black text-dark/40 uppercase tracking-wider px-2 mb-1">
          Pomodoro
        </h4>
        <PomodoroTimer tasks={tasks} compact />
      </div>

      <div className="mt-auto pt-4 border-t-2 border-dark/20 flex flex-col gap-1">
        <button
          onClick={() => { handleNavClick(); onOpenHelp?.() }}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-sm text-dark border-2 border-transparent hover:bg-accent hover:border-dark transition-all"
        >
          <span className="w-5 h-5 rounded-full border-2 border-dark text-xs font-black flex items-center justify-center flex-shrink-0">?</span>
          도움말
        </button>
        <button
          onClick={() => { handleNavClick(); onOpenSettings() }}
          className="w-full flex items-center px-4 py-3 rounded-lg font-bold text-sm text-dark border-2 border-transparent hover:bg-accent hover:border-dark transition-all"
        >
          설정
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar (lg+) */}
      <aside className="hidden lg:flex flex-col w-56 min-h-full bg-white border-r-2 border-dark pt-6 pb-10 px-3 gap-1">
        {sidebarContent}
      </aside>

      {/* Mobile drawer (below lg) */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[55]" onClick={onCloseDrawer}>
          <div className="absolute inset-0 bg-dark/40" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r-2 border-dark pt-6 pb-10 px-3 flex flex-col gap-1 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
