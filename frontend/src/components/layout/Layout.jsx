import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import SettingsModal from '../SettingsModal'

export default function Layout() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <Header />
      <div className="flex flex-1">
        <Sidebar onOpenSettings={() => setShowSettings(true)} />
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
