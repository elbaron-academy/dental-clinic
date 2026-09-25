import { createContext, useContext } from 'react'
import type { Me, Role } from '../api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: Me | null
  login: (phone: string, password: string, role: Role) => Promise<Me>
  logout: () => Promise<void>
  hasPerm: (...perms: string[]) => boolean
  /** Signed out because the session expired or was revoked elsewhere. */
  sessionExpired: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

/** The signed-in user; only use below a route guard. */
export function useUser(): Me {
  const { user } = useAuth()
  if (!user) throw new Error('useUser requires an authenticated user')
  return user
}
