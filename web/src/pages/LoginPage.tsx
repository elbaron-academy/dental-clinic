import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { useAuth } from '../auth/context'
import { ROLES, roleBySlug } from '../auth/roles'
import { Logo } from '../components/Layout'
import { Field } from '../components/ui'
import { AppVersion } from '../components/AppVersion'

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
  const [showPassword, setShowPassword] = useState(false)
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
          <div className="password-input-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((show) => !show)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={pending || !phone || !password}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth-footer">
          Not a {info.label.toLowerCase()}? <Link to="/login">Choose another portal</Link>
        </p>
        <AppVersion />
      </form>
    </div>
  )
}
