import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as api from '../../api/endpoints'
import type { Appointment } from '../../api/types'
import { useAuth, useUser } from '../../auth/context'
import { DoctorSelect } from '../../components/DoctorSelect'
import { Card, ErrorAlert, Field, Loading, PageHeader, StatusBadge } from '../../components/ui'
import { dateTimeInputToIso, formatDateTime, toDateTimeInput } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import { BillingPanel } from './BillingPanel'

export function AppointmentDetail() {
  const id = Number(useParams().id)
  const { user, hasPerm } = useAuth()
  const navigate = useNavigate()
  const appointment = useAsync(() => api.getAppointment(id), [id])
  const [actionError, setActionError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const [editing, setEditing] = useState(false)

  if (appointment.loading && !appointment.data) return <Loading />
  if (appointment.error && !appointment.data) return <ErrorAlert error={appointment.error} />
  const a = appointment.data
  if (!a) return null

  async function act(action: () => Promise<Appointment>, openVisit = false) {
    setPending(true)
    setActionError(null)
    try {
      const updated = await action()
      appointment.setData(updated)
      if (openVisit && updated.visit_id && hasPerm('visits.view_visit') && updated.doctor.id === user?.id) {
        navigate(`/visits/${updated.visit_id}`)
      }
    } catch (error) {
      setActionError(error)
      void appointment.reload()
    } finally {
      setPending(false)
    }
  }

  const open = a.status === 'SCHEDULED' || a.status === 'CHECKED_IN'
  return (
    <>
      <PageHeader
        title={a.patient.full_name}
        subtitle={
          <>
            {formatDateTime(a.scheduled_at)} · {a.doctor.full_name}
          </>
        }
        actions={<StatusBadge status={a.status} label={a.status_display} />}
      />
      <ErrorAlert error={actionError} />
      <div className="grid-2">
        <Card title="Appointment">
          <dl className="details">
            <dt>Patient</dt>
            <dd>
              <Link to={`/patients/${a.patient.id}`}>{a.patient.full_name}</Link> · {a.patient.phone}
            </dd>
            <dt>Doctor</dt>
            <dd>{a.doctor.full_name}</dd>
            <dt>Scheduled</dt>
            <dd>{formatDateTime(a.scheduled_at)}</dd>
            {a.checked_in_at && (
              <>
                <dt>Checked in</dt>
                <dd>{formatDateTime(a.checked_in_at)}</dd>
              </>
            )}
            {a.notes && (
              <>
                <dt>Notes</dt>
                <dd className="pre-line">{a.notes}</dd>
              </>
            )}
            {a.follow_up_of && (
              <>
                <dt>Follow-up of</dt>
                <dd>{hasPerm('visits.view_visit') ? <Link to={`/visits/${a.follow_up_of}`}>Visit #{a.follow_up_of}</Link> : `Visit #${a.follow_up_of}`}</dd>
              </>
            )}
          </dl>
          <div className="button-row">
            {a.status === 'SCHEDULED' && hasPerm('appointments.check_in_appointment') && (
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => act(() => api.checkIn(a.id))}>
                Check in
              </button>
            )}
            {a.status === 'CHECKED_IN' && hasPerm('visits.start_visit') && (
              <button type="button" className="btn btn-primary" disabled={pending} onClick={() => act(() => api.startVisit(a.id), true)}>
                Start visit
              </button>
            )}
            {a.visit_id && hasPerm('visits.view_visit') && (
              <Link to={`/visits/${a.visit_id}`} className="btn btn-secondary">
                {a.status === 'IN_VISIT' && a.doctor.id === user?.id ? 'Open visit' : 'View visit'}
              </Link>
            )}
            {open && hasPerm('appointments.change_appointment') && !editing && (
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
                Reschedule / change doctor
              </button>
            )}
            {open && hasPerm('appointments.cancel_appointment') && (
              <button
                type="button"
                className="btn btn-danger"
                disabled={pending}
                onClick={() => {
                  if (window.confirm('Cancel this appointment?')) void act(() => api.cancelAppointment(a.id))
                }}
              >
                Cancel appointment
              </button>
            )}
          </div>
          {editing && (
            <RescheduleForm
              appointment={a}
              onDone={(updated) => {
                setEditing(false)
                if (updated) appointment.setData(updated)
              }}
            />
          )}
        </Card>
        {a.billing && <BillingPanel appointment={a} onChanged={() => void appointment.reload()} />}
      </div>
    </>
  )
}

function RescheduleForm({ appointment, onDone }: { appointment: Appointment; onDone: (updated?: Appointment) => void }) {
  const user = useUser()
  const [when, setWhen] = useState(() => toDateTimeInput(new Date(appointment.scheduled_at)))
  const [doctor, setDoctor] = useState<number | ''>(appointment.doctor.id)
  const [notes, setNotes] = useState(appointment.notes)
  const [error, setError] = useState<unknown>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      const updated = await api.updateAppointment(appointment.id, {
        scheduled_at: dateTimeInputToIso(when),
        notes,
        doctor_id: doctor === '' ? undefined : doctor,
      })
      onDone(updated)
    } catch (err) {
      setError(err)
    }
  }

  const apiError = error instanceof ApiError ? error : null
  return (
    <form className="form subform" onSubmit={onSubmit}>
      <ErrorAlert error={error} />
      <Field label="Date and time" htmlFor="reschedule_at" error={apiError?.field('scheduled_at')}>
        <input id="reschedule_at" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} required />
      </Field>
      {user.permitted_doctors.length > 1 && (
        <DoctorSelect id="reschedule_doctor" doctors={user.permitted_doctors} value={doctor} onChange={setDoctor} error={apiError?.field('doctor_id')} />
      )}
      <Field label="Notes" htmlFor="reschedule_notes">
        <textarea id="reschedule_notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onDone()}>
          Close
        </button>
        <button type="submit" className="btn btn-primary">
          Save
        </button>
      </div>
    </form>
  )
}
