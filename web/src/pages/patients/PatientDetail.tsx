import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import * as api from '../../api/endpoints'
import type { Visit } from '../../api/types'
import { useAuth } from '../../auth/context'
import { DentalChart } from '../../components/DentalChart'
import { Card, EmptyState, ErrorAlert, Loading, PageHeader, PaymentBadge, StatusBadge, SuccessAlert } from '../../components/ui'
import { VisitDetails } from '../../components/VisitDetails'
import { formatDateTime, formatMoney } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'

export function PatientDetail() {
  const id = Number(useParams().id)
  const location = useLocation()
  const { hasPerm } = useAuth()
  const patient = useAsync(() => api.getPatient(id), [id])
  const appointments = useAsync(
    () => api.listAppointments({ patient: id, ordering: '-scheduled_at', page_size: 50 }),
    [id],
  )
  const canSeeVisits = hasPerm('visits.view_visit')
  const canSeeBilling = hasPerm('payments.view_payment')
  const visits = useAsync(() => (canSeeVisits ? api.listVisits({ patient: id }) : Promise.resolve(null)), [id, canSeeVisits])
  const balance = useAsync(() => (canSeeBilling ? api.getPatientBalance(id) : Promise.resolve(null)), [id, canSeeBilling])

  if (patient.loading && !patient.data) return <Loading />
  if (patient.error) return <ErrorAlert error={patient.error} />
  const p = patient.data
  if (!p) return null
  const saved = (location.state as { saved?: boolean } | null)?.saved

  return (
    <>
      <PageHeader
        title={p.full_name}
        subtitle={p.is_minor ? 'Minor' : undefined}
        actions={
          <>
            {hasPerm('patients.change_patient') && (
              <Link to={`/patients/${p.id}/edit`} className="btn btn-secondary">
                Edit
              </Link>
            )}
            {hasPerm('appointments.add_appointment') && (
              <Link to={`/appointments/new?patient=${p.id}`} className="btn btn-primary">
                New appointment
              </Link>
            )}
          </>
        }
      />
      {saved && <SuccessAlert>Patient saved.</SuccessAlert>}
      <div className="grid-2">
        <Card title="Details">
          <dl className="details">
            <dt>Phone</dt>
            <dd>{p.phone}</dd>
            <dt>Address</dt>
            <dd>{p.address || <span className="muted">Not provided</span>}</dd>
            {p.is_minor && (
              <>
                <dt>Guardian</dt>
                <dd>
                  {p.guardian_name} · {p.guardian_phone}
                </dd>
              </>
            )}
            <dt>Doctors</dt>
            <dd>{p.doctors.map((d) => d.full_name).join(', ')}</dd>
          </dl>
        </Card>
        {canSeeBilling && (
          <Card title="Balance">
            {balance.data ? (
              <dl className="details money" data-testid="patient-balance">
                <dt>Amount due</dt>
                <dd>{formatMoney(balance.data.amount_due)}</dd>
                <dt>Paid</dt>
                <dd>{formatMoney(balance.data.amount_paid)}</dd>
                <dt>Remaining</dt>
                <dd className="strong">{formatMoney(balance.data.remaining_amount)}</dd>
              </dl>
            ) : (
              <ErrorAlert error={balance.error} />
            )}
          </Card>
        )}
      </div>

      <Card title="Appointments">
        <ErrorAlert error={appointments.error} />
        {appointments.data && appointments.data.results.length === 0 && <EmptyState>No appointments yet.</EmptyState>}
        <ul className="list" aria-label="Patient appointments">
          {appointments.data?.results.map((a) => (
            <li key={a.id} className="list-row">
              <div className="list-time wide">{formatDateTime(a.scheduled_at)}</div>
              <div className="list-main">
                <span>{a.doctor.full_name}</span>
                <div className="list-meta">
                  <StatusBadge status={a.status} label={a.status_display} />
                  {a.billing && <PaymentBadge status={a.billing.payment_status} label={a.billing.payment_status_display} />}
                </div>
              </div>
              <Link to={`/appointments/${a.id}`} className="btn btn-small btn-ghost">
                Details
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {canSeeVisits && visits.data && <PatientChartCard visits={visits.data.results} />}

      {canSeeVisits && (
        <Card title="Visit history">
          <ErrorAlert error={visits.error} />
          {visits.loading && !visits.data && <Loading />}
          {visits.data && visits.data.results.length === 0 && (
            <EmptyState>No previous visits. This patient has no history yet.</EmptyState>
          )}
          <ol className="timeline" aria-label="Visit history">
            {visits.data?.results.map((visit) => (
              <li key={visit.id} className="timeline-item">
                <div className="timeline-head">
                  <strong>{formatDateTime(visit.started_at)}</strong>
                  <span>{visit.doctor.full_name}</span>
                  <StatusBadge status={visit.status} label={visit.status_display} />
                  <Link to={`/visits/${visit.id}`} className="btn btn-small btn-ghost">
                    {visit.can_edit ? 'Continue visit' : 'Open'}
                  </Link>
                </div>
                <VisitDetails visit={visit} />
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  )
}

/** The dental chart of one of the patient's visits, newest charted visit first (CHART-007). */
function PatientChartCard({ visits }: { visits: Visit[] }) {
  const charted = visits.filter((v) => v.tooth_actions.length > 0)
  const [chosen, setChosen] = useState<number | null>(null)
  const visit = charted.find((v) => v.id === chosen) ?? charted[0]

  return (
    <Card
      title="Dental chart"
      actions={
        visit && (
          <Link to={`/visits/${visit.id}`} className="btn btn-small btn-ghost">
            {visit.can_edit ? 'Continue visit' : 'Open visit'}
          </Link>
        )
      }
    >
      {!visit ? (
        <EmptyState>No teeth charted yet. The doctor marks teeth on the dental chart of an active visit.</EmptyState>
      ) : (
        <>
          {charted.length > 1 && (
            <div className="field chart-visit-select">
              <label htmlFor="chart_visit">Visit</label>
              <select id="chart_visit" value={visit.id} onChange={(event) => setChosen(Number(event.target.value))}>
                {charted.map((v) => (
                  <option key={v.id} value={v.id}>
                    {formatDateTime(v.started_at)} · {v.doctor.full_name} · {v.status_display}
                  </option>
                ))}
              </select>
            </div>
          )}
          {charted.length === 1 && (
            <p className="muted">
              Visit of {formatDateTime(visit.started_at)} with {visit.doctor.full_name}
            </p>
          )}
          <DentalChart key={visit.id} visit={visit} />
        </>
      )}
    </Card>
  )
}
