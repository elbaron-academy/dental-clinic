import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../api/endpoints'
import type { Appointment } from '../api/types'
import { useAuth } from '../auth/context'

interface Props {
  appointment: Appointment
  onChanged: () => void
  onError: (error: unknown) => void
}

/** Queue-state actions allowed for the current user (APPT-002, APPT-004). */
export function AppointmentActions({ appointment, onChanged, onError }: Props) {
  const { user, hasPerm } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  async function perform(action: () => Promise<Appointment>, openVisit = false) {
    setPending(true)
    try {
      const result = await action()
      if (openVisit && result.visit_id && hasPerm('visits.view_visit') && result.doctor.id === user?.id) {
        navigate(`/visits/${result.visit_id}`)
        return
      }
      onChanged()
    } catch (error) {
      onError(error)
    } finally {
      setPending(false)
    }
  }

  const { status } = appointment
  return (
    <div className="row-actions">
      {status === 'SCHEDULED' && hasPerm('appointments.check_in_appointment') && (
        <button
          type="button"
          className="btn btn-small btn-secondary"
          disabled={pending}
          onClick={() => perform(() => api.checkIn(appointment.id))}
        >
          Check in
        </button>
      )}
      {status === 'CHECKED_IN' && hasPerm('visits.start_visit') && (
        <button
          type="button"
          className="btn btn-small btn-primary"
          disabled={pending}
          onClick={() => perform(() => api.startVisit(appointment.id), true)}
        >
          Start visit
        </button>
      )}
      {appointment.visit_id && hasPerm('visits.view_visit') && (
        <Link className="btn btn-small btn-ghost" to={`/visits/${appointment.visit_id}`}>
          {status === 'IN_VISIT' && appointment.doctor.id === user?.id ? 'Open visit' : 'View visit'}
        </Link>
      )}
      <Link className="btn btn-small btn-ghost" to={`/appointments/${appointment.id}`} aria-label={`Details for ${appointment.patient.full_name}`}>
        Details
      </Link>
    </div>
  )
}
