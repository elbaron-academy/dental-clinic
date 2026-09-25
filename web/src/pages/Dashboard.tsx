import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/endpoints'
import type { Role } from '../api/types'
import { useAuth, useUser } from '../auth/context'
import { AppointmentList } from '../components/AppointmentList'
import { Card, ErrorAlert, Loading, PageHeader } from '../components/ui'
import { formatDate, localDayRange } from '../lib/format'
import { useAsync, useInterval } from '../lib/useAsync'

const TITLES: Record<Role, { title: string; waiting: string; inVisit: string }> = {
  RECEPTIONIST: { title: 'Reception', waiting: 'Waiting for doctor', inVisit: 'In visit' },
  DOCTOR: { title: 'My day', waiting: 'My queue', inVisit: 'My active visits' },
  ASSISTANT: { title: 'Clinic overview', waiting: 'Waiting for doctor', inVisit: 'In visit' },
}

/** Role home: queue, visits in progress and today's appointments (APPT-003). */
export function Dashboard({ role }: { role: Role }) {
  const user = useUser()
  const { hasPerm } = useAuth()
  const [doctor, setDoctor] = useState<number | ''>('')
  const [actionError, setActionError] = useState<unknown>(null)
  const texts = TITLES[role]
  const doctorId = doctor === '' ? undefined : doctor

  const queue = useAsync(() => api.getQueue(doctorId), [doctorId])
  const today = useAsync(() => {
    const { from, to } = localDayRange()
    return api.listAppointments({ scheduled_from: from, scheduled_to: to, doctor: doctorId, page_size: 200 })
  }, [doctorId])

  const refresh = () => {
    void queue.reload()
    void today.reload()
  }
  useInterval(refresh, 30_000)

  const onChanged = () => {
    setActionError(null)
    refresh()
  }
  const onError = (error: unknown) => {
    setActionError(error)
    refresh()
  }

  return (
    <>
      <PageHeader
        title={texts.title}
        subtitle={formatDate(new Date())}
        actions={
          <>
            {hasPerm('patients.add_patient') && (
              <Link to="/patients/new" className="btn btn-secondary">
                Register patient
              </Link>
            )}
            {hasPerm('appointments.add_appointment') && (
              <Link to="/appointments/new" className="btn btn-primary">
                New appointment
              </Link>
            )}
            <button type="button" className="btn btn-ghost" onClick={refresh}>
              Refresh
            </button>
          </>
        }
      />
      {user.permitted_doctors.length > 1 && (
        <div className="toolbar">
          <label htmlFor="dashboard-doctor">Doctor</label>
          <select
            id="dashboard-doctor"
            value={doctor}
            onChange={(event) => setDoctor(event.target.value ? Number(event.target.value) : '')}
          >
            <option value="">All my doctors</option>
            {user.permitted_doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        </div>
      )}
      {user.permitted_doctors.length === 0 && (
        <div className="alert alert-error" role="alert">
          You are not assigned to any doctor yet. Ask an administrator to assign you in Django Admin.
        </div>
      )}
      <ErrorAlert error={actionError} />
      <div className="grid-2">
        <Card title={`${texts.waiting}${queue.data ? ` (${queue.data.waiting.length})` : ''}`}>
          {queue.loading && !queue.data ? (
            <Loading />
          ) : (
            <>
              <ErrorAlert error={queue.error} onRetry={queue.reload} />
              <AppointmentList
                label={texts.waiting}
                appointments={queue.data?.waiting ?? []}
                empty="Nobody is waiting."
                timeField="checked_in_at"
                onChanged={onChanged}
                onError={onError}
              />
            </>
          )}
        </Card>
        <Card title={`${texts.inVisit}${queue.data ? ` (${queue.data.in_visit.length})` : ''}`}>
          {queue.loading && !queue.data ? (
            <Loading />
          ) : (
            <AppointmentList
              label={texts.inVisit}
              appointments={queue.data?.in_visit ?? []}
              empty="No visits in progress."
              onChanged={onChanged}
              onError={onError}
            />
          )}
        </Card>
      </div>
      <Card title="Today's appointments" actions={<Link to="/appointments">All appointments</Link>}>
        {today.loading && !today.data ? (
          <Loading />
        ) : (
          <>
            <ErrorAlert error={today.error} onRetry={today.reload} />
            <AppointmentList
              label="Today's appointments"
              appointments={today.data?.results ?? []}
              empty="No appointments today."
              onChanged={onChanged}
              onError={onError}
            />
          </>
        )}
      </Card>
    </>
  )
}
