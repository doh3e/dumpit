import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { createPortal } from 'react-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import SettingsModal from '../SettingsModal'
import PomodoroTimer from '../PomodoroTimer'
import api from '../../services/api'

export default function Layout() {
  const [showSettings, setShowSettings] = useState(false)
  const [showMobileTimer, setShowMobileTimer] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    api.get('/tasks')
      .then((res) => setTasks(res.data))
      .catch(() => setTasks([]))
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <Header onOpenDrawer={() => setDrawerOpen(true)} />
      <div className="flex flex-1">
        <Sidebar
          onOpenSettings={() => setShowSettings(true)}
          tasks={tasks}
          isDrawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
        />
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

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
            <PomodoroTimer tasks={tasks} />
          </div>
        </div>,
        document.body
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
