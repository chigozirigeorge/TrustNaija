import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { UserProfile, AuthResponse } from '@/types'
import { getProfile } from '@/lib/api'

interface AuthContextValue {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (auth: AuthResponse) => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  login: () => {},
  logout: () => {},
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tn_token'))
  const [loading, setLoading] = useState(true)

  const login = useCallback((auth: AuthResponse) => {
    localStorage.setItem('tn_token', auth.token)
    setToken(auth.token)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('tn_token')
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    getProfile()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false))
  }, [token, logout])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'admin' || user?.role === 'moderator',
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
