import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)
const INACTIVE_LOGOUT_MS = 60 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(() => {
    api.get('/auth/me')
      .then((res) => {
        const nextUser = res.data
        setUser(nextUser && typeof nextUser === 'object' && nextUser.email ? nextUser : null)
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    if (!user) return undefined
    if (window.dumpitDesktop) return undefined

    let hiddenAt = document.visibilityState === 'hidden' ? Date.now() : null
    let timerId = null
    let loggingOut = false

    const clearLogoutTimer = () => {
      if (timerId) {
        window.clearTimeout(timerId)
        timerId = null
      }
    }

    const logoutForInactivity = async () => {
      if (loggingOut) return
      loggingOut = true
      clearLogoutTimer()
      try {
        await api.post('/auth/logout')
      } finally {
        setUser(null)
        window.location.href = '/'
      }
    }

    const scheduleLogout = () => {
      clearLogoutTimer()
      if (!hiddenAt) return

      const remaining = INACTIVE_LOGOUT_MS - (Date.now() - hiddenAt)
      if (remaining <= 0) {
        logoutForInactivity()
        return
      }
      timerId = window.setTimeout(logoutForInactivity, remaining)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        scheduleLogout()
        return
      }

      if (hiddenAt && Date.now() - hiddenAt >= INACTIVE_LOGOUT_MS) {
        logoutForInactivity()
        return
      }

      hiddenAt = null
      clearLogoutTimer()
      fetchUser()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)
    scheduleLogout()

    return () => {
      clearLogoutTimer()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [fetchUser, user])

  const refreshCoins = () => {
    api.get('/auth/me')
      .then((res) => {
        const nextUser = res.data
        setUser(nextUser && typeof nextUser === 'object' && nextUser.email ? nextUser : null)
      })
      .catch(() => {})
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshCoins }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
