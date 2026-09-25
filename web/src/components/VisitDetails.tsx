import { Link } from 'react-router-dom'
import type { Visit } from '../api/types'
import { formatDateTime } from '../lib/format'
import { StatusBadge } from './ui'

/** Read-only rendering of a visit's clinical record (history, completed visits). */
export function VisitDetails({ visit }: { visit: Visit }) {
  const hasContent =
    visit.notes || visit.diagnosis || visit.treatment || visit.procedures.length || visit.medications.length
  return (
    <div className="visit-details">
      {!hasContent && <p className="muted">Nothing recorded yet.</p>}
      {visit.notes && <Section title="Notes">{visit.notes}</Section>}
      {visit.diagnosis && <Section title="Diagnosis">{visit.diagnosis}</Section>}
      {visit.treatment && <Section title="Treatment">{visit.treatment}</Section>}
      {visit.procedures.length > 0 && (
        <Section title="Procedures">
          <ul className="plain-list">
            {visit.procedures.map((entry) => (
              <li key={entry.id}>
                {entry.procedure?.name ?? 'Other'}
                {entry.tooth && <span className="badge badge-muted">Tooth {entry.tooth}</span>}
                {entry.notes && <span className="muted"> — {entry.notes}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {visit.medications.length > 0 && (
        <Section title="Medications">
          <ul className="plain-list">
            {visit.medications.map((entry) => (
              <li key={entry.id}>
                {entry.medication.name} {entry.medication.details && <span className="muted">({entry.medication.details})</span>} —{' '}
                {entry.quantity}, {entry.duration}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {visit.follow_ups.length > 0 && (
        <Section title="Follow-ups">
          <ul className="plain-list">
            {visit.follow_ups.map((follow) => (
              <li key={follow.id}>
                <Link to={`/appointments/${follow.id}`}>{formatDateTime(follow.scheduled_at)}</Link>{' '}
                <StatusBadge status={follow.status} label={follow.status_display} />
                {follow.notes && <span className="muted"> — {follow.notes}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="detail-section">
      <h3>{title}</h3>
      <div className="pre-line">{children}</div>
    </div>
  )
}
