import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { clearToken, fetchMe, getToken, login as apiLogin, type User } from './api'

type AuthStatus = 'loading' | 'authed' | 'anon'

type AuthContextValue = {
  status: AuthStatus
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  async function refresh() {
    if (!getToken()) {
      setUser(null)
      setStatus('anon')
      return
    }
    try {
      const me = await fetchMe()
      setUser(me)
      setStatus('authed')
    } catch {
      clearToken()
      setUser(null)
      setStatus('anon')
    }
  }

  useEffect(() => {
    refresh()
    // Logout automático quando a API responde 401 (token expirado/inválido).
    const onUnauthorized = () => {
      setUser(null)
      setStatus('anon')
    }
    window.addEventListener('anora-unauthorized', onUnauthorized)
    return () => window.removeEventListener('anora-unauthorized', onUnauthorized)
  }, [])

  async function login(email: string, password: string) {
    const loggedIn = await apiLogin(email, password)
    setUser(loggedIn)
    setStatus('authed')
  }

  function logout() {
    clearToken()
    setUser(null)
    setStatus('anon')
  }

  return (
    <AuthContext.Provider value={{ status, user, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
