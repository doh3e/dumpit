import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import StarField from '../StarField'
import SettingsModal from '../SettingsModal'
import HelpModal from '../HelpModal'
import NoticeModal from '../NoticeModal'
import PomodoroTimer from '../PomodoroTimer'
import Dialog from '../Dialog'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { watchSystemTheme } from '../../utils/theme'
import { watchSystemContrast } from '../../utils/a11y'
import useDocumentTitle, { titleFor } from '../../hooks/useDocumentTitle'

const HELP_SEEN_KEY = 'dumpit_help_seen'

export default function Layout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  useDocumentTitle(titleFor(pathname))
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showMobileTimer, setShowMobileTimer] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [focusRecommendation, setFocusRecommendation] = useState(null)
  const [unreadNotices, setUnreadNotices] = useState([])
  const drawerOpenerRef = useRef(null)

  const fetchTasks = useCallback(() => {
    if (!user) {
      setTasks([])
      setFocusRecommendation(null)
      return
    }
    api.get('/dashboard/planning')
      .then((res) => {
        const data = res.data || {}
        setTasks(Array.isArray(data.tasks) ? data.tasks : [])
        setFocusRecommendation(data.focusRecommendations?.[0] || null)
      })
      .catch(() => {
        setTasks([])
        setFocusRecommendation(null)
      })
  }, [user])

  useEffect(() => {
    if (!user) {
      setTasks([])
      setFocusRecommendation(null)
      setUnreadNotices([])
      return
    }

    fetchTasks()
    api.get('/notices/unread')
      .then((res) => setUnreadNotices(Array.isArray(res.data) ? res.data : []))
      .catch(() => setUnreadNotices([]))

    const interval = window.setInterval(fetchTasks, 60000)
    window.addEventListener('focus', fetchTasks)
    window.addEventListener('dumpit:tasks-updated', fetchTasks)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', fetchTasks)
      window.removeEventListener('dumpit:tasks-updated', fetchTasks)
    }
  }, [fetchTasks, user])

  useEffect(() => {
    if (!localStorage.getItem(HELP_SEEN_KEY)) {
      setShowHelp(true)
    }
  }, [])

  useEffect(() => watchSystemTheme(), [])
  useEffect(() => watchSystemContrast(), [])

  const openDrawer = () => {
    drawerOpenerRef.current = document.activeElement
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    // inert가 풀린 다음 프레임에 복귀해야 포커스가 body로 튕기지 않는다
    setTimeout(() => drawerOpenerRef.current?.focus?.(), 0)
  }

  const handleCloseHelp = () => {
    localStorage.setItem(HELP_SEEN_KEY, '1')
    setShowHelp(false)
  }

  const handleCloseNotice = async () => {
    const current = unreadNotices[0]
    if (!current) return
    setUnreadNotices((prev) => prev.slice(1))
    try {
      await api.post(`/notices/${current.noticeId}/read`)
    } catch {}
  }

  return (
    <div
      className="flex flex-col min-h-screen bg-skin"
      inert={drawerOpen || undefined}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div id="a11y-announcer" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      <StarField />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] btn-retro">
        본문으로 건너뛰기
      </a>
      <Header
        onOpenDrawer={openDrawer}
        onOpenHelp={() => setShowHelp(true)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <div className="relative z-10 flex flex-1">
        <Sidebar
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelp={() => setShowHelp(true)}
          tasks={tasks}
          focusRecommendation={focusRecommendation}
          isDrawerOpen={drawerOpen}
          onCloseDrawer={closeDrawer}
        />
        <main id="main" tabIndex={-1} className="flex-1 min-w-0 p-4 sm:p-6 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      <Footer />

      <button
        type="button"
        onClick={() => setShowMobileTimer(true)}
        aria-label="뽀모도로 타이머 열기"
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-on-accent font-dungeon text-lg flex items-center justify-center"
        style={{ border: '1.5px solid var(--edge)', boxShadow: '3px 3px 0 var(--shadow-sm)' }}
      >
        25
      </button>

      {showMobileTimer && (
        <Dialog onClose={() => setShowMobileTimer(false)} title="뽀모도로 타이머" placement="bottom" className="w-full max-w-sm lg:hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-dungeon text-dark text-sm">Pomodoro Timer</h3>
            <button
              onClick={() => setShowMobileTimer(false)}
              aria-label="닫기"
              className="w-7 h-7 rounded-lg border border-line font-black text-sub text-xs hover:bg-chip transition-colors"
            >
              X
            </button>
          </div>
          <PomodoroTimer tasks={tasks} recommendedTaskId={focusRecommendation?.task?.taskId} />
        </Dialog>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showHelp && <HelpModal onClose={handleCloseHelp} />}
      {unreadNotices[0] && <NoticeModal notice={unreadNotices[0]} onClose={handleCloseNotice} />}
    </div>
  )
}
