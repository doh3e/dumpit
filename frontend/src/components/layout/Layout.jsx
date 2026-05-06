import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { createPortal } from 'react-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import SettingsModal from '../SettingsModal'
import HelpModal from '../HelpModal'
import NoticeModal from '../NoticeModal'
import PomodoroTimer from '../PomodoroTimer'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const HELP_SEEN_KEY = 'dumpit_help_seen'

export default function Layout() {
  const { user } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showMobileTimer, setShowMobileTimer] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [focusRecommendation, setFocusRecommendation] = useState(null)
  const [unreadNotices, setUnreadNotices] = useState([])

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

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', fetchTasks)
    }
  }, [fetchTasks, user])

  useEffect(() => {
    if (!localStorage.getItem(HELP_SEEN_KEY)) {
      setShowHelp(true)
    }
  }, [])

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
    <div className="flex flex-col min-h-screen bg-accent">
      <Header
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenHelp={() => setShowHelp(true)}
      />
      <div className="flex flex-1">
        <Sidebar
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelp={() => setShowHelp(true)}
          tasks={tasks}
          focusRecommendation={focusRecommendation}
          isDrawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
        />
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      <Footer />

      {/* Mobile floating timer button - only visible below lg */}
      <button
        onClick={() => setShowMobileTimer(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary border-2 border-dark shadow-kitschy flex items-center justify-center text-white font-black text-lg"
      >
        25
      </button>

      {/* Mobile timer popup */}
      {showMobileTimer && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center lg:hidden" onClick={() => setShowMobileTimer(false)}>
          <div className="absolute inset-0 bg-dark/40" />
          <div
            className="relative w-full max-w-sm mx-4 mb-6 card-kitschy"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-dark text-sm">Pomodoro Timer</h3>
              <button
                onClick={() => setShowMobileTimer(false)}
                className="w-7 h-7 rounded-lg border-2 border-dark font-black text-dark text-xs hover:bg-primary hover:text-white transition-colors"
              >
                X
              </button>
            </div>
            <PomodoroTimer tasks={tasks} recommendedTaskId={focusRecommendation?.task?.taskId} />
          </div>
        </div>,
        document.body
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showHelp && <HelpModal onClose={handleCloseHelp} />}
      {unreadNotices[0] && <NoticeModal notice={unreadNotices[0]} onClose={handleCloseNotice} />}
    </div>
  )
}
