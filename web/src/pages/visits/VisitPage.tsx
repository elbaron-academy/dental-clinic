import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as api from '../../api/endpoints'
import type { CatalogMedication, CatalogProcedure, Visit } from '../../api/types'
import { Card, EmptyState, ErrorAlert, Field, Loading, PageHeader, StatusBadge, SuccessAlert } from '../../components/ui'
import { VisitDetails } from '../../components/VisitDetails'
import { dateTimeInputToIso, formatDateTime, toDateTimeInput } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'

export function VisitPage() {
  const id = Number(useParams().id)
  const visit = useAsync(() => api.getVisit(id), [id])
  if (visit.loading && !visit.data) return <Loading />
  if (visit.error && !visit.data) return <ErrorAlert error={visit.error} />
  const v = visit.data
  if (!v) return null

  return (
    <>
      <PageHeader
        title={v.patient.full_name}
        subtitle={
          <>
            Visit with {v.doctor.full_name} · started {formatDateTime(v.started_at)}
            {v.completed_at && <> · completed {formatDateTime(v.completed_at)}</>}
          </>
        }
        actions={
          <>
            <StatusBadge status={v.status} label={v.status_display} />
            <Link to={`/patients/${v.patient.id}`} className="btn btn-ghost">
              Patient history
            </Link>
          </>
        }
      />
      {v.can_edit ? (
        <VisitEditor visit={v} onChange={visit.setData} />
      ) : (
        <Card title="Clinical record">
          {v.status === 'ACTIVE' && (
            <p className="muted">This visit is being recorded by {v.doctor.full_name}. Only they can change it.</p>
          )}
          {v.status === 'COMPLETED' && <SuccessAlert>This visit is completed and kept in the patient's history.</SuccessAlert>}
          <VisitDetails visit={v} />
        </Card>
      )}
    </>
  )
}

/** The owning doctor records the session and completes the visit (VISIT-001..007). */
function VisitEditor({ visit, onChange }: { visit: Visit; onChange: (visit: Visit) => void }) {
  const procedures = useAsync(() => api.listProcedures(), [])
  const medications = useAsync(() => api.listMedications(), [])
  const [notes, setNotes] = useState({ notes: visit.notes, diagnosis: visit.diagnosis, treatment: visit.treatment })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const dirty =
    notes.notes !== visit.notes || notes.diagnosis !== visit.diagnosis || notes.treatment !== visit.treatment

  async function saveNotes(): Promise<Visit> {
    const updated = await api.updateVisit(visit.id, notes)
    onChange(updated)
    return updated
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await saveNotes()
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  async function onComplete() {
    if (!window.confirm('Complete this visit? It can no longer be changed afterwards.')) return
    setPending(true)
    setError(null)
    try {
      if (dirty) await saveNotes()
      onChange(await api.completeVisit(visit.id))
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  const update = (key: keyof typeof notes) => (event: { target: { value: string } }) => {
    setSaved(false)
    setNotes((current) => ({ ...current, [key]: event.target.value }))
  }

  return (
    <>
      <ErrorAlert error={error} />
      <Card title="Session notes">
        <form className="form" onSubmit={onSave}>
          <Field label="Visit notes" htmlFor="visit_notes" hint="Complaint, findings, description of the session">
            <textarea id="visit_notes" rows={3} value={notes.notes} onChange={update('notes')} />
          </Field>
          <Field label="Diagnosis" htmlFor="visit_diagnosis">
            <textarea id="visit_diagnosis" rows={2} value={notes.diagnosis} onChange={update('diagnosis')} />
          </Field>
          <Field label="Treatment" htmlFor="visit_treatment">
            <textarea id="visit_treatment" rows={2} value={notes.treatment} onChange={update('treatment')} />
          </Field>
          <div className="form-actions">
            {saved && !dirty && <span className="saved">Saved</span>}
            {dirty && <span className="muted">Unsaved changes</span>}
            <button type="submit" className="btn btn-secondary" disabled={pending || !dirty}>
              Save notes
            </button>
          </div>
        </form>
      </Card>
      <div className="grid-2">
        <ProceduresCard visit={visit} catalog={procedures.data ?? []} onChange={onChange} />
        <MedicationsCard visit={visit} catalog={medications.data ?? []} onChange={onChange} />
      </div>
      <FollowUpsCard visit={visit} onChange={onChange} />
      <Card className="complete-card">
        <div className="complete-row">
          <p className="muted">When the session outcome is recorded, complete the visit. It stays in the patient's history.</p>
          <button type="button" className="btn btn-primary" onClick={onComplete} disabled={pending}>
            Complete visit
          </button>
        </div>
      </Card>
    </>
  )
}

function useEntryForm() {
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  async function submit(action: () => Promise<void>) {
    setPending(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }
  const field = (name: string) => (error instanceof ApiError ? error.field(name) : undefined)
  return { error, pending, submit, field }
}

function ProceduresCard({ visit, catalog, onChange }: { visit: Visit; catalog: CatalogProcedure[]; onChange: (v: Visit) => void }) {
  const [procedure, setProcedure] = useState<number | ''>('')
  const [tooth, setTooth] = useState('')
  const [notes, setNotes] = useState('')
  const form = useEntryForm()

  return (
    <Card title="Tooth / procedures">
      {visit.procedures.length === 0 ? (
        <EmptyState>No procedures recorded.</EmptyState>
      ) : (
        <ul className="entry-list" aria-label="Recorded procedures">
          {visit.procedures.map((entry) => (
            <li key={entry.id}>
              <span>
                <strong>{entry.procedure?.name ?? 'Other'}</strong>
                {entry.tooth && <span className="badge badge-muted">Tooth {entry.tooth}</span>}
                {entry.notes && <span className="muted"> — {entry.notes}</span>}
              </span>
              <button
                type="button"
                className="btn btn-link"
                aria-label={`Remove ${entry.procedure?.name ?? 'procedure'}`}
                onClick={() => form.submit(async () => onChange(await api.removeProcedure(visit.id, entry.id)))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="form subform"
        aria-label="Add procedure"
        onSubmit={(event) => {
          event.preventDefault()
          void form.submit(async () => {
            onChange(
              await api.addProcedure(visit.id, {
                procedure_id: procedure === '' ? null : procedure,
                tooth: tooth.trim(),
                notes,
              }),
            )
            setProcedure('')
            setTooth('')
            setNotes('')
          })
        }}
      >
        <Field label="Procedure" htmlFor="procedure_id" error={form.field('procedure_id')}>
          <select id="procedure_id" value={procedure} onChange={(event) => setProcedure(event.target.value ? Number(event.target.value) : '')}>
            <option value="">Other (describe in notes)</option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.code ? ` (${item.code})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Tooth" htmlFor="tooth" error={form.field('tooth')} hint="FDI, e.g. 36 or 55">
            <input id="tooth" inputMode="numeric" maxLength={2} value={tooth} onChange={(event) => setTooth(event.target.value)} />
          </Field>
          <Field label="Procedure notes" htmlFor="procedure_notes" error={form.field('notes')}>
            <input id="procedure_notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </div>
        {!form.field('procedure_id') && !form.field('tooth') && <ErrorAlert error={form.error} />}
        <button type="submit" className="btn btn-secondary" disabled={form.pending}>
          Add procedure
        </button>
      </form>
    </Card>
  )
}

function MedicationsCard({ visit, catalog, onChange }: { visit: Visit; catalog: CatalogMedication[]; onChange: (v: Visit) => void }) {
  const [medication, setMedication] = useState<number | ''>('')
  const [quantity, setQuantity] = useState('')
  const [duration, setDuration] = useState('')
  const form = useEntryForm()

  return (
    <Card title="Medications">
      {visit.medications.length === 0 ? (
        <EmptyState>No medications prescribed.</EmptyState>
      ) : (
        <ul className="entry-list" aria-label="Prescribed medications">
          {visit.medications.map((entry) => (
            <li key={entry.id}>
              <span>
                <strong>{entry.medication.name}</strong> {entry.medication.details && <span className="muted">({entry.medication.details})</span>} —{' '}
                {entry.quantity}, {entry.duration}
              </span>
              <button
                type="button"
                className="btn btn-link"
                aria-label={`Remove ${entry.medication.name}`}
                onClick={() => form.submit(async () => onChange(await api.removeMedication(visit.id, entry.id)))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="form subform"
        aria-label="Add medication"
        onSubmit={(event) => {
          event.preventDefault()
          if (medication === '') return
          void form.submit(async () => {
            onChange(await api.addMedication(visit.id, { medication_id: medication, quantity, duration }))
            setMedication('')
            setQuantity('')
            setDuration('')
          })
        }}
      >
        <Field label="Medication" htmlFor="medication_id" error={form.field('medication_id')} required>
          <select id="medication_id" value={medication} required onChange={(event) => setMedication(event.target.value ? Number(event.target.value) : '')}>
            <option value="">Select a medication…</option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.details ? ` — ${item.details}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Quantity" htmlFor="quantity" error={form.field('quantity')} required hint="e.g. 21 capsules, 1 tablet 3× daily">
            <input id="quantity" value={quantity} required onChange={(event) => setQuantity(event.target.value)} />
          </Field>
          <Field label="Duration" htmlFor="duration" error={form.field('duration')} required hint="e.g. 7 days">
            <input id="duration" value={duration} required onChange={(event) => setDuration(event.target.value)} />
          </Field>
        </div>
        {!form.field('quantity') && !form.field('duration') && !form.field('medication_id') && <ErrorAlert error={form.error} />}
        <button type="submit" className="btn btn-secondary" disabled={form.pending || medication === '' || !quantity || !duration}>
          Add medication
        </button>
      </form>
    </Card>
  )
}

function defaultFollowUp(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setHours(10, 0, 0, 0)
  return toDateTimeInput(date)
}

function FollowUpsCard({ visit, onChange }: { visit: Visit; onChange: (v: Visit) => void }) {
  const [when, setWhen] = useState(defaultFollowUp)
  const [notes, setNotes] = useState('')
  const form = useEntryForm()

  return (
    <Card title="Follow-up visits">
      {visit.follow_ups.length === 0 ? (
        <EmptyState>No follow-up booked.</EmptyState>
      ) : (
        <ul className="entry-list" aria-label="Follow-up visits">
          {visit.follow_ups.map((follow) => (
            <li key={follow.id}>
              <span>
                <strong>{formatDateTime(follow.scheduled_at)}</strong> <StatusBadge status={follow.status} label={follow.status_display} />
                {follow.notes && <span className="muted"> — {follow.notes}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="form subform inline-form"
        aria-label="Book follow-up"
        onSubmit={(event) => {
          event.preventDefault()
          void form.submit(async () => {
            onChange(await api.addFollowUp(visit.id, { scheduled_at: dateTimeInputToIso(when), notes }))
            setNotes('')
          })
        }}
      >
        <Field label="Follow-up date and time" htmlFor="follow_up_at" error={form.field('scheduled_at')}>
          <input id="follow_up_at" type="datetime-local" value={when} required onChange={(event) => setWhen(event.target.value)} />
        </Field>
        <Field label="Follow-up notes" htmlFor="follow_up_notes">
          <input id="follow_up_notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
        </Field>
        <button type="submit" className="btn btn-secondary" disabled={form.pending || !when}>
          Book follow-up
        </button>
        {!form.field('scheduled_at') && <ErrorAlert error={form.error} />}
      </form>
    </Card>
  )
}
