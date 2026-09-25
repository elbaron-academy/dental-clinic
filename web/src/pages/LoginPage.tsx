import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { useAuth } from '../auth/context'
import { ROLES, roleBySlug } from '../auth/roles'
import { Logo } from '../components/Layout'
import { Field } from '../components/ui'

/**
 * Role-specific login pages (S02-PWA-01..03): Doctor, Assistant and
 * Receptionist each have their own page. All use phone number + password
 * (AUTH-001); the API refuses accounts of another role (CR-003).
 */
export function LoginPage() {
  const { role: slug } = useParams()
  const info = roleBySlug(slug)
  const { user, login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)

  if (!info) return <Navigate to="/login" replace />
  if (user) return <Navigate to={ROLES[user.role].home} replace />

  const from = (location.state as { from?: string } | null)?.from

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!info) return
    setPending(true)
    setError(null)
    try {
      const me = await login(phone.trim(), password, info.role)
      navigate(from && from !== '/' ? from : ROLES[me.role].home, { replace: true })
    } catch (err) {
      setError(err)
      setPending(false)
    }
  }

  const fieldError = (name: string) => (error instanceof ApiError ? error.field(name) : undefined)
  const formError = error instanceof ApiError && Object.keys(error.fieldErrors).length ? null : error

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="auth-brand">
          <Logo />
          <h1>{info.label} sign in</h1>
          <p className="muted">{info.description}</p>
        </div>
        {sessionExpired && !error && (
          <div className="alert alert-info" role="status">
            Your session ended. Please sign in again.
          </div>
        )}
        {formError ? (
          <div className="alert alert-error" role="alert">
            {errorMessage(formError)}
          </div>
        ) : null}
        <Field label="Phone number" htmlFor="phone" error={fieldError('phone')} required>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Password" htmlFor="password" error={fieldError('password')} required>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={pending || !phone || !password}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth-footer">
          Not a {info.label.toLowerCase()}? <Link to="/login">Choose another portal</Link>
        </p>
      </form>
    </div>
  )
}
