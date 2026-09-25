import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '../api/types'
import { useAuth } from './context'
import { ROLES } from './roles'

function FullPageSpinner() {
  return (
    <div className="page-center" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" /> Loading…
    </div>
  )
}

/** Requires a signed-in user; otherwise sends them to the login chooser. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, lastRole } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullPageSpinner />
  if (status === 'anonymous') {
    // After logout or an expired session, go back to the user's own login page.
    const target = lastRole ? ROLES[lastRole].login : '/login'
    return <Navigate to={target} replace state={lastRole ? undefined : { from: location.pathname }} />
  }
  return <>{children}</>
}

/** Role-aware routing: a role home is only for that role (AUTH-002). */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== role) return <Navigate to={ROLES[user.role].home} replace />
  return <>{children}</>
}

/** Feature routes are guarded by permissions, not role names. */
export function RequirePermission({ perms, children }: { perms: string[]; children: ReactNode }) {
  const { hasPerm } = useAuth()
  if (!hasPerm(...perms)) {
    return (
      <div className="card empty-state" role="alert">
        <h2>Not available</h2>
        <p>Your account does not have permission to open this page.</p>
      </div>
    )
  }
  return <>{children}</>
}

export function HomeRedirect() {
  const { status, user } = useAuth()
  if (status === 'loading') return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLES[user.role].home} replace />
}
