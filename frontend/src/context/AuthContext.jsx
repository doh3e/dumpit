import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { applySkins, clearSkins } from '../shop/applySkins.js'
import { clearDraft, pruneExpiredDrafts } from '../services/brainDumpDraft'
import { loadUserSettings, resetUserSettings, startUserSettingsSession } from '../services/userSettings'
import { AuthContext } from './authState'

const INACTIVE_LOGOUT_MS = 60 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const requestGenerationRef = useRef(0)
  const activeAccountRef = useRef(null)

  const applyMeResponse = useCallback((res) => {
    const nextUser = res?.data
    const validUser = nextUser && typeof nextUser === 'object' && nextUser.email ? nextUser : null
    setUser(validUser)
    if (validUser) {
      if (activeAccountRef.current !== validUser.email) {
        activeAccountRef.current = validUser.email
        startUserSettingsSession(validUser.email)
      }
      applySkins(validUser.equipments)
      void loadUserSettings()
    } else {
      activeAccountRef.current = null
      clearSkins()
      resetUserSettings()
    }
  }, [])

  const fetchUser = useCallback(async () => {
    const generation = ++requestGenerationRef.current
    try {
      const response = await api.get('/auth/me')
      if (!mountedRef.current || generation !== requestGenerationRef.current) return
      applyMeResponse(response)
    } catch {
      if (!mountedRef.current || generation !== requestGenerationRef.current) return
      applyMeResponse(null)
    } finally {
      if (mountedRef.current && generation === requestGenerationRef.current) setLoading(false)
    }
  }, [applyMeResponse])

  useEffect(() => {
    mountedRef.current = true
    try { pruneExpiredDrafts() } catch { /* 정리 실패는 인증 시작을 막지 않는다. */ }
    void fetchUser()
    return () => {
      mountedRef.current = false
      requestGenerationRef.current += 1
    }
  }, [fetchUser])

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
        requestGenerationRef.current += 1
        activeAccountRef.current = null
        setUser(null)
        clearSkins()
        resetUserSettings()
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
    return fetchUser()
  }

  const logout = async () => {
    const accountKey = activeAccountRef.current
    requestGenerationRef.current += 1
    try {
      await api.post('/auth/logout')
    } finally {
      requestGenerationRef.current += 1
      activeAccountRef.current = null
      setUser(null)
      clearSkins()
      resetUserSettings()
      if (accountKey) {
        try {
          clearDraft(accountKey)
        } catch {
          window.alert('로그아웃했지만 이 기기의 원문 초안을 지우지 못했어요.')
        }
      }
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshCoins }}>
      {children}
    </AuthContext.Provider>
  )
}
