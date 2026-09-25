import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { ROLE_LIST, ROLES } from '../auth/roles'
import { Logo } from '../components/Layout'

export function LoginChooser() {
  const { user } = useAuth()
  if (user) return <Navigate to={ROLES[user.role].home} replace />
  return (
    <div className="auth-page">
      <div className="auth-card wide">
        <div className="auth-brand">
          <Logo />
          <h1>Dental Clinic</h1>
          <p className="muted">Choose your portal to sign in with your phone number.</p>
        </div>
        <ul className="portal-list">
          {ROLE_LIST.map((info) => (
            <li key={info.role}>
              <Link to={info.login} className="portal">
                <strong>{info.label}</strong>
                <span className="muted">{info.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
