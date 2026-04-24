import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { label: '대시보드', path: '/dashboard' },
  { label: '브레인 덤프', path: '/brain-dump' },
  { label: '코인샵', path: '/shop' },
]

export default function Header({ onOpenDrawer }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

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
          <div className="hidden sm:flex items-center gap-1 bg-secondary border-2 border-dark rounded-full px-3 py-1 shadow-kitschy">
            <span className="text-sm font-extrabold text-white">{user?.coins ?? 0} C</span>
          </div>

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
