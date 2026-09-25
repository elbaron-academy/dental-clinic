import type { DoctorSummary } from '../api/types'
import { Field } from './ui'

interface Props {
  doctors: DoctorSummary[]
  value: number | ''
  onChange: (id: number | '') => void
  error?: string
  id?: string
  label?: string
}

/**
 * Doctor selection (CLINIC-002 / CLINIC-003): with a single permitted doctor it
 * is selected automatically; otherwise the user picks from permitted doctors.
 */
export function DoctorSelect({ doctors, value, onChange, error, id = 'doctor', label = 'Doctor' }: Props) {
  if (doctors.length === 0) {
    return (
      <div className="alert alert-error" role="alert">
        You are not assigned to any doctor. Ask an administrator to assign you in Django Admin.
      </div>
    )
  }
  if (doctors.length === 1) {
    return (
      <div className="field">
        <span className="label">{label}</span>
        <p className="static-value" data-testid="auto-doctor">
          {doctors[0].full_name} <span className="muted">(selected automatically)</span>
        </p>
      </div>
    )
  }
  return (
    <Field label={label} htmlFor={id} error={error} required>
      <select
        id={id}
        value={value}
        required
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : '')}
      >
        <option value="">Select a doctor…</option>
        {doctors.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.full_name}
          </option>
        ))}
      </select>
    </Field>
  )
}
