import type { ReactNode } from 'react'
import { errorMessage } from '../api/client'
import type { AppointmentStatus, PaymentStatus, VisitStatus } from '../api/types'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" /> {label}
    </div>
  )
}

export function ErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null
  return (
    <div className="alert alert-error" role="alert">
      <span>{errorMessage(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-link" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function SuccessAlert({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-success" role="status">
      {children}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

const STATUS_TONE: Record<AppointmentStatus | VisitStatus, string> = {
  SCHEDULED: 'info',
  CHECKED_IN: 'warning',
  IN_VISIT: 'accent',
  ACTIVE: 'accent',
  COMPLETED: 'success',
  CANCELLED: 'muted',
}

export function StatusBadge({ status, label }: { status: AppointmentStatus | VisitStatus; label: string }) {
  return <span className={`badge badge-${STATUS_TONE[status]}`}>{label}</span>
}

const PAYMENT_TONE: Record<PaymentStatus, string> = { NOT_SET: 'muted', PENDING: 'warning', PAID: 'success' }

export function PaymentBadge({ status, label }: { status: PaymentStatus; label: string }) {
  return <span className={`badge badge-${PAYMENT_TONE[status]}`}>{label}</span>
}

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: ReactNode
  required?: boolean
  children: ReactNode
}

export function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && (
        <p className="field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
