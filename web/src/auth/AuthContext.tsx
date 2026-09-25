import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'
import * as api from '../api/endpoints'
import type { Me, Role } from '../api/types'
import { AuthContext, type AuthStatus } from './context'

const TOKEN_KEY = 'dental-clinic.token'

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage may be unavailable (private mode); the session then lasts for this tab only.
  }
  setAuthToken(token)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (readToken() ? 'loading' : 'anonymous'))
  const [sessionExpired, setSessionExpired] = useState(false)
  const [lastRole, setLastRole] = useState<Role | null>(null)
  const userRef = useRef<Me | null>(null)
  useEffect(() => {
    userRef.current = user
  }, [user])

  const clear = useCallback(() => {
    if (userRef.current) setLastRole(userRef.current.role)
    writeToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionExpired(true)
      clear()
    })
    return () => setUnauthorizedHandler(null)
  }, [clear])

  // Restore the session from a stored token.
  useEffect(() => {
    const token = readToken()
    if (!token) return
    setAuthToken(token)
    let cancelled = false
    api
      .getMe()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) clear()
      })
    return () => {
      cancelled = true
    }
  }, [clear])

  const login = useCallback(async (phone: string, password: string, role: Role) => {
    const response = await api.login(phone, password, role)
    writeToken(response.token)
    setUser(response.user)
    setSessionExpired(false)
    setStatus('authenticated')
    return response.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // The token is discarded locally even if the server cannot be reached.
    }
    clear()
  }, [clear])

  const hasPerm = useCallback(
    (...perms: string[]) => !!user && perms.every((perm) => user.permissions.includes(perm)),
    [user],
  )

  const value = useMemo(
    () => ({ status, user, login, logout, hasPerm, sessionExpired, lastRole }),
    [status, user, login, logout, hasPerm, sessionExpired, lastRole],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
