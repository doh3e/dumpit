import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = () => {
    api.get('/auth/me')
      .then((res) => {
        const nextUser = res.data
        setUser(nextUser && typeof nextUser === 'object' && nextUser.email ? nextUser : null)
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUser() }, [])

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
