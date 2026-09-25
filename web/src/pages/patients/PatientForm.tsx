import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as api from '../../api/endpoints'
import type { Patient, PatientInput } from '../../api/types'
import { useUser } from '../../auth/context'
import { DoctorSelect } from '../../components/DoctorSelect'
import { Card, ErrorAlert, Field, Loading, PageHeader } from '../../components/ui'
import { resolveDoctor } from '../../lib/doctors'
import { useAsync } from '../../lib/useAsync'
import { validatePatient, type PatientErrors as Errors } from './validation'

export function PatientFormPage() {
  const { id } = useParams()
  const patientId = id ? Number(id) : undefined
  const existing = useAsync(() => (patientId ? api.getPatient(patientId) : Promise.resolve(undefined)), [patientId])
  if (patientId && existing.loading) return <Loading />
  if (patientId && existing.error) return <ErrorAlert error={existing.error} />
  return <PatientForm patient={existing.data} />
}

function PatientForm({ patient }: { patient?: Patient }) {
  const user = useUser()
  const navigate = useNavigate()
  const doctors = user.permitted_doctors
  const [form, setForm] = useState<PatientInput>({
    full_name: patient?.full_name ?? '',
    phone: patient?.phone ?? '',
    address: patient?.address ?? '',
    is_minor: patient?.is_minor ?? false,
    guardian_name: patient?.guardian_name ?? '',
    guardian_phone: patient?.guardian_phone ?? '',
  })
  const [doctor, setDoctor] = useState<number | ''>('')
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)

  const update = <K extends keyof PatientInput>(key: K, value: PatientInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const clientErrors = validatePatient(form)
    const doctorId = resolveDoctor(doctors, doctor)
    if (!patient && !doctorId) clientErrors.doctor = 'Select a doctor.'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setPending(true)
    setError(null)
    try {
      const saved = patient
        ? await api.updatePatient(patient.id, form)
        : await api.createPatient({ ...form, doctor_ids: doctorId ? [doctorId] : undefined })
      navigate(`/patients/${saved.id}`, { replace: true, state: { saved: true } })
    } catch (err) {
      setPending(false)
      if (err instanceof ApiError) {
        setErrors({
          full_name: err.field('full_name'),
          phone: err.field('phone'),
          address: err.field('address'),
          guardian_name: err.field('guardian_name'),
          guardian_phone: err.field('guardian_phone'),
          doctor: err.field('doctor_ids'),
        })
      }
      setError(err)
    }
  }

  return (
    <>
      <PageHeader title={patient ? `Edit ${patient.full_name}` : 'Register patient'} />
      <Card>
        <form className="form" onSubmit={onSubmit} noValidate>
          <ErrorAlert error={error} />
          <div className="form-grid">
            <Field label="Full name" htmlFor="full_name" error={errors.full_name} required>
              <input
                id="full_name"
                value={form.full_name}
                onChange={(event) => update('full_name', event.target.value)}
                autoComplete="off"
                required
              />
            </Field>
            <Field label="Phone number" htmlFor="phone" error={errors.phone} required>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="Address" htmlFor="address" error={errors.address} hint="Optional">
            <textarea id="address" rows={2} value={form.address} onChange={(event) => update('address', event.target.value)} />
          </Field>
          <div className="field checkbox">
            <input
              id="is_minor"
              type="checkbox"
              checked={form.is_minor}
              onChange={(event) => update('is_minor', event.target.checked)}
            />
            <label htmlFor="is_minor">Patient is a minor</label>
          </div>
          {form.is_minor && (
            <fieldset className="fieldset">
              <legend>Guardian</legend>
              <div className="form-grid">
                <Field label="Guardian name" htmlFor="guardian_name" error={errors.guardian_name} required>
                  <input
                    id="guardian_name"
                    value={form.guardian_name}
                    onChange={(event) => update('guardian_name', event.target.value)}
                    required
                  />
                </Field>
                <Field label="Guardian phone" htmlFor="guardian_phone" error={errors.guardian_phone} required>
                  <input
                    id="guardian_phone"
                    type="tel"
                    inputMode="tel"
                    value={form.guardian_phone}
                    onChange={(event) => update('guardian_phone', event.target.value)}
                    required
                  />
                </Field>
              </div>
            </fieldset>
          )}
          {!patient && <DoctorSelect doctors={doctors} value={doctor} onChange={setDoctor} error={errors.doctor} />}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? 'Saving…' : patient ? 'Save changes' : 'Register patient'}
            </button>
          </div>
        </form>
      </Card>
    </>
  )
}
