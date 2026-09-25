import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as api from '../../api/endpoints'
import type { Patient } from '../../api/types'
import { useAuth, useUser } from '../../auth/context'
import { DoctorSelect } from '../../components/DoctorSelect'
import { Card, ErrorAlert, Field, Loading, PageHeader } from '../../components/ui'
import { dateTimeInputToIso, nextQuarterHour, toDateTimeInput } from '../../lib/format'
import { resolveDoctor } from '../../lib/doctors'
import { useAsync } from '../../lib/useAsync'

/** Reception creates an appointment for a patient and doctor (APPT-001, CLINIC-002/003). */
export function AppointmentForm() {
  const [params] = useSearchParams()
  const presetId = params.get('patient') ? Number(params.get('patient')) : undefined
  const preset = useAsync(() => (presetId ? api.getPatient(presetId) : Promise.resolve(undefined)), [presetId])
  if (presetId && preset.loading) return <Loading />
  return <AppointmentFormInner preset={preset.data} />
}

function AppointmentFormInner({ preset }: { preset?: Patient }) {
  const user = useUser()
  const { hasPerm } = useAuth()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<Patient | undefined>(preset)
  const [doctor, setDoctor] = useState<number | ''>(() => {
    const own = preset?.doctors.find((d) => user.permitted_doctors.some((p) => p.id === d.id))
    return user.permitted_doctors.length > 1 && own ? own.id : ''
  })
  const [when, setWhen] = useState(() => toDateTimeInput(nextQuarterHour()))
  const [notes, setNotes] = useState('')
  const [checkInNow, setCheckInNow] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const canCheckIn = hasPerm('appointments.check_in_appointment')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const doctorId = resolveDoctor(user.permitted_doctors, doctor)
    const clientErrors: Record<string, string> = {}
    if (!patient) clientErrors.patient = 'Select a patient.'
    if (!doctorId) clientErrors.doctor = 'Select a doctor.'
    if (!when) clientErrors.scheduled_at = 'Choose a date and time.'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length || !patient) return

    setPending(true)
    setError(null)
    try {
      let appointment = await api.createAppointment({
        patient_id: patient.id,
        doctor_id: doctorId,
        scheduled_at: dateTimeInputToIso(when),
        notes,
      })
      if (checkInNow) appointment = await api.checkIn(appointment.id)
      navigate(`/appointments/${appointment.id}`, { replace: true })
    } catch (err) {
      setPending(false)
      if (err instanceof ApiError) {
        setErrors({
          patient: err.field('patient_id'),
          doctor: err.field('doctor_id'),
          scheduled_at: err.field('scheduled_at'),
          notes: err.field('notes'),
        })
      }
      setError(err)
    }
  }

  return (
    <>
      <PageHeader title="New appointment" />
      <Card>
        <form className="form" onSubmit={onSubmit} noValidate>
          <ErrorAlert error={error} />
          <PatientPicker patient={patient} onChange={setPatient} error={errors.patient} />
          <DoctorSelect doctors={user.permitted_doctors} value={doctor} onChange={setDoctor} error={errors.doctor} />
          <Field label="Date and time" htmlFor="scheduled_at" error={errors.scheduled_at} required>
            <input id="scheduled_at" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} required />
          </Field>
          <Field label="Notes" htmlFor="notes" error={errors.notes} hint="Optional, e.g. reason for the visit">
            <textarea id="notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          {canCheckIn && (
            <div className="field checkbox">
              <input id="check_in_now" type="checkbox" checked={checkInNow} onChange={(event) => setCheckInNow(event.target.checked)} />
              <label htmlFor="check_in_now">Patient is here now (walk-in): check in immediately</label>
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? 'Saving…' : 'Create appointment'}
            </button>
          </div>
        </form>
      </Card>
    </>
  )
}

function PatientPicker({ patient, onChange, error }: { patient?: Patient; onChange: (p?: Patient) => void; error?: string }) {
  const { hasPerm } = useAuth()
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<{ query: string; results: Patient[] }>({ query: '', results: [] })
  const term = query.trim()
  const active = !patient && term.length >= 2
  const results = active && found.query === term ? found.results : []
  const searching = active && found.query !== term

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const id = window.setTimeout(async () => {
      try {
        const page = await api.listPatients({ search: term })
        if (!cancelled) setFound({ query: term, results: page.results.slice(0, 8) })
      } catch {
        if (!cancelled) setFound({ query: term, results: [] })
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [active, term])

  if (patient) {
    return (
      <div className="field">
        <span className="label">Patient</span>
        <div className="static-value selected-patient">
          <strong>{patient.full_name}</strong> <span className="muted">{patient.phone}</span>
          <button type="button" className="btn btn-link" onClick={() => onChange(undefined)}>
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <Field
      label="Patient"
      htmlFor="patient_search"
      error={error}
      required
      hint={
        hasPerm('patients.add_patient') ? (
          <>
            Type at least 2 characters of the name or phone. New patient? <Link to="/patients/new">Register first</Link>.
          </>
        ) : (
          'Type at least 2 characters of the name or phone.'
        )
      }
    >
      <input
        id="patient_search"
        type="search"
        autoComplete="off"
        value={query}
        placeholder="Search patients"
        onChange={(event) => setQuery(event.target.value)}
      />
      {searching && <p className="hint">Searching…</p>}
      {results.length > 0 && (
        <ul className="picker" role="listbox" aria-label="Matching patients">
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" role="option" aria-selected="false" onClick={() => onChange(result)}>
                <strong>{result.full_name}</strong> <span className="muted">{result.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}
