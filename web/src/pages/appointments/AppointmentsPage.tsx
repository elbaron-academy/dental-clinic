import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/endpoints'
import type { AppointmentStatus } from '../../api/types'
import { useAuth, useUser } from '../../auth/context'
import { AppointmentList } from '../../components/AppointmentList'
import { Card, ErrorAlert, Loading, PageHeader } from '../../components/ui'
import { fromDateInput, localDayRange, toDateInput } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'

const STATUS_OPTIONS: { value: '' | AppointmentStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CHECKED_IN', label: 'Waiting for doctor' },
  { value: 'IN_VISIT', label: 'In visit' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function AppointmentsPage() {
  const user = useUser()
  const { hasPerm } = useAuth()
  const [day, setDay] = useState(() => toDateInput(new Date()))
  const [doctor, setDoctor] = useState<number | ''>('')
  const [status, setStatus] = useState<'' | AppointmentStatus>('')
  const [actionError, setActionError] = useState<unknown>(null)

  const appointments = useAsync(() => {
    const { from, to } = localDayRange(fromDateInput(day))
    return api.listAppointments({
      scheduled_from: from,
      scheduled_to: to,
      doctor: doctor === '' ? undefined : doctor,
      status: status ? [status] : undefined,
      page_size: 200,
    })
  }, [day, doctor, status])

  return (
    <>
      <PageHeader
        title="Appointments"
        actions={
          hasPerm('appointments.add_appointment') && (
            <Link to="/appointments/new" className="btn btn-primary">
              New appointment
            </Link>
          )
        }
      />
      <Card>
        <div className="toolbar">
          <input type="date" aria-label="Day" value={day} onChange={(event) => event.target.value && setDay(event.target.value)} />
          {user.permitted_doctors.length > 1 && (
            <select
              aria-label="Doctor"
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
          )}
          <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as '' | AppointmentStatus)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <ErrorAlert error={actionError ?? appointments.error} />
        {appointments.loading && !appointments.data ? (
          <Loading />
        ) : (
          <AppointmentList
            label="Appointments"
            appointments={appointments.data?.results ?? []}
            empty="No appointments for this day."
            onChanged={() => {
              setActionError(null)
              void appointments.reload()
            }}
            onError={(error) => {
              setActionError(error)
              void appointments.reload()
            }}
          />
        )}
      </Card>
    </>
  )
}
