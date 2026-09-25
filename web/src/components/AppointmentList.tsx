import { Link } from 'react-router-dom'
import type { Appointment } from '../api/types'
import { useAuth } from '../auth/context'
import { formatDateTime, formatTime } from '../lib/format'
import { AppointmentActions } from './AppointmentActions'
import { EmptyState, PaymentBadge, StatusBadge } from './ui'

interface Props {
  appointments: Appointment[]
  empty: string
  onChanged: () => void
  onError: (error: unknown) => void
  /** Which timestamp to show in the first column. */
  timeField?: 'scheduled_at' | 'checked_in_at'
  showDate?: boolean
  label: string
}

export function AppointmentList({ appointments, empty, onChanged, onError, timeField = 'scheduled_at', showDate, label }: Props) {
  const { user } = useAuth()
  const showDoctor = (user?.permitted_doctors.length ?? 0) > 1
  if (appointments.length === 0) return <EmptyState>{empty}</EmptyState>
  return (
    <ul className="list" aria-label={label}>
      {appointments.map((appointment) => {
        const time = appointment[timeField]
        return (
          <li key={appointment.id} className="list-row" data-testid={`appointment-${appointment.id}`}>
            <div className="list-time">{showDate ? formatDateTime(time) : formatTime(time)}</div>
            <div className="list-main">
              <Link to={`/patients/${appointment.patient.id}`} className="strong">
                {appointment.patient.full_name}
              </Link>
              <div className="list-meta">
                {showDoctor && <span>{appointment.doctor.full_name}</span>}
                <StatusBadge status={appointment.status} label={appointment.status_display} />
                {appointment.billing && (
                  <PaymentBadge
                    status={appointment.billing.payment_status}
                    label={appointment.billing.payment_status_display}
                  />
                )}
                {appointment.follow_up_of && <span className="badge badge-muted">Follow-up</span>}
              </div>
            </div>
            <AppointmentActions appointment={appointment} onChanged={onChanged} onError={onError} />
          </li>
        )
      })}
    </ul>
  )
}
