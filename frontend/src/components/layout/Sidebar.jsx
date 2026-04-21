import { NavLink, Link } from 'react-router-dom'
import PomodoroTimer from '../PomodoroTimer'

const MENU = [
  { label: '나의 태스크', path: '/dashboard' },
  { label: '브레인 덤프', path: '/brain-dump' },
  { label: '코인샵', path: '/shop' },
]

export default function Sidebar({ onOpenSettings, tasks }) {
  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-full bg-white border-r-2 border-dark pt-6 pb-10 px-3 gap-1">
      <Link to="/dashboard" className="flex items-center justify-center mb-4 px-2">
        <img src="/logo.png" alt="DumpIt" className="h-36 w-auto" />
      </Link>

      {MENU.map(({ label, path }) => (
        <NavLink
          key={path}
          to={path}
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

      <div className="mt-4 pt-4 border-t-2 border-dark/20">
        <h4 className="text-[10px] font-black text-dark/40 uppercase tracking-wider px-2 mb-1">
          Pomodoro
        </h4>
        <PomodoroTimer tasks={tasks} compact />
      </div>

      <div className="mt-auto pt-4 border-t-2 border-dark/20">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center px-4 py-3 rounded-lg font-bold text-sm text-dark border-2 border-transparent hover:bg-accent hover:border-dark transition-all"
        >
          설정
        </button>
      </div>
    </aside>
  )
}
