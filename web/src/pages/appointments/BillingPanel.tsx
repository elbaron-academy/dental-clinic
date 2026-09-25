import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import * as api from '../../api/endpoints'
import type { Appointment } from '../../api/types'
import { useAuth } from '../../auth/context'
import { Card, EmptyState, ErrorAlert, Field, PaymentBadge } from '../../components/ui'
import { formatDateTime, formatMoney } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'

/**
 * Amount due, amount paid and remaining balance of one appointment
 * (PAY-001..004). Payment can be recorded before or after the visit.
 */
export function BillingPanel({ appointment, onChanged }: { appointment: Appointment; onChanged: () => void }) {
  const { hasPerm } = useAuth()
  const billing = appointment.billing
  const payments = useAsync(() => api.listPayments({ appointment: appointment.id }), [appointment.id, billing?.amount_paid])
  if (!billing) return null

  const cancelled = appointment.status === 'CANCELLED'
  const canManage = hasPerm('payments.manage_billing') && !cancelled
  const remaining = billing.remaining_amount === null ? null : Number(billing.remaining_amount)
  const canPay = hasPerm('payments.add_payment') && !cancelled && remaining !== null && remaining > 0

  return (
    <Card title="Payment" actions={<PaymentBadge status={billing.payment_status} label={billing.payment_status_display} />}>
      <dl className="details money" data-testid="billing-summary">
        <dt>Amount due</dt>
        <dd>{billing.amount_due === null ? <span className="muted">Not set</span> : formatMoney(billing.amount_due)}</dd>
        <dt>Paid</dt>
        <dd>{formatMoney(billing.amount_paid)}</dd>
        <dt>Remaining</dt>
        <dd className="strong">{formatMoney(billing.remaining_amount)}</dd>
      </dl>
      {canManage && <AmountDueForm appointment={appointment} onSaved={onChanged} />}
      {canPay && (
        <PaymentForm
          key={billing.remaining_amount}
          appointment={appointment}
          remaining={billing.remaining_amount ?? ''}
          onSaved={onChanged}
        />
      )}
      <h3 className="subheading">Payments received</h3>
      <ErrorAlert error={payments.error} />
      {payments.data && payments.data.results.length === 0 ? (
        <EmptyState>No payments recorded.</EmptyState>
      ) : (
        <ul className="plain-list" aria-label="Payments received">
          {payments.data?.results.map((payment) => (
            <li key={payment.id}>
              <strong>{formatMoney(payment.amount)}</strong> · {payment.method.name} · {formatDateTime(payment.received_at)}
              {payment.received_by && <span className="muted"> · {payment.received_by}</span>}
              {payment.note && <span className="muted"> — {payment.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function AmountDueForm({ appointment, onSaved }: { appointment: Appointment; onSaved: () => void }) {
  const [value, setValue] = useState(appointment.billing?.amount_due ?? '')
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await api.setAmountDue(appointment.id, value)
      onSaved()
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  const fieldError = error instanceof ApiError ? error.field('amount_due') : undefined
  return (
    <form className="inline-form" onSubmit={onSubmit} aria-label="Amount due">
      <Field label="Amount due" htmlFor="amount_due" error={fieldError}>
        <input
          id="amount_due"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
        />
      </Field>
      <button type="submit" className="btn btn-secondary" disabled={pending || value === ''}>
        {appointment.billing?.amount_due === null ? 'Set amount due' : 'Update amount due'}
      </button>
      {!fieldError && <ErrorAlert error={error} />}
    </form>
  )
}

function PaymentForm({ appointment, remaining, onSaved }: { appointment: Appointment; remaining: string; onSaved: () => void }) {
  const methods = useAsync(() => api.listPaymentMethods(), [])
  const [amount, setAmount] = useState(remaining)
  const [method, setMethod] = useState<number | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const methodId = method === '' ? methods.data?.[0]?.id : method

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!methodId) return
    setPending(true)
    setError(null)
    try {
      await api.recordPayment({ appointment_id: appointment.id, amount, method_id: methodId, note })
      setNote('')
      onSaved()
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  const apiError = error instanceof ApiError ? error : null
  return (
    <form className="inline-form" onSubmit={onSubmit} aria-label="Record payment">
      <Field label="Payment amount" htmlFor="payment_amount" error={apiError?.field('amount')}>
        <input
          id="payment_amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </Field>
      <Field label="Method" htmlFor="payment_method" error={apiError?.field('method_id')}>
        <select id="payment_method" value={methodId ?? ''} onChange={(event) => setMethod(Number(event.target.value))}>
          {methods.data?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note" htmlFor="payment_note">
        <input id="payment_note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
      </Field>
      <button type="submit" className="btn btn-primary" disabled={pending || !amount || !methodId}>
        Record payment
      </button>
      {!apiError?.field('amount') && !apiError?.field('method_id') && <ErrorAlert error={error} />}
    </form>
  )
}
