import { useId, useState, type FormEvent } from 'react'
import { ApiError, errorMessage } from '../api/client'
import * as api from '../api/endpoints'
import type { DentalActionType, Visit, VisitToothAction } from '../api/types'
import { CHART_ROWS, colorBands, dentitionOf, isUpper, toothKind, type Dentition, type ToothKind } from '../lib/teeth'
import { EmptyState, Field } from './ui'

interface DentalChartProps {
  visit: Visit
  /** Selectable actions; only used when the chart is editable. */
  actionTypes?: DentalActionType[]
  /** Makes the chart editable (owning doctor, active visit). */
  onChange?: (visit: Visit) => void
  /** Lets the doctor add a new action type while charting (CHART-006). */
  onCreateType?: (input: NewActionInput) => Promise<DentalActionType>
}

export interface NewActionInput {
  name: string
  color: string
}

/** Colors offered for a new action, in order, skipping those already in use. */
const NEW_ACTION_COLORS = ['#DB2777', '#EA580C', '#0891B2', '#65A30D', '#9333EA', '#CA8A04', '#BE123C', '#4F46E5']

function suggestColor(types: DentalActionType[]): string {
  const used = new Set(types.map((t) => t.color.toUpperCase()))
  return NEW_ACTION_COLORS.find((c) => !used.has(c)) ?? NEW_ACTION_COLORS[0]
}

/**
 * Dental chart of one visit (CHART-001..004). Each visit has its own chart:
 * teeth are colored by the actions marked in this visit only.
 */
export function DentalChart({ visit, actionTypes = [], onChange, onCreateType }: DentalChartProps) {
  const editable = !!onChange
  const actions = visit.tooth_actions
  const [dentition, setDentition] = useState<Dentition>(() =>
    actions.length > 0 && actions.every((a) => dentitionOf(a.tooth) === 'primary') ? 'primary' : 'permanent',
  )
  const [selected, setSelected] = useState<string | null>(null)

  const byTooth = new Map<string, VisitToothAction[]>()
  for (const action of actions) byTooth.set(action.tooth, [...(byTooth.get(action.tooth) ?? []), action])
  const countIn = (d: Dentition) => actions.filter((a) => dentitionOf(a.tooth) === d).length
  const rows = CHART_ROWS[dentition]

  const renderRow = (label: string, [right, left]: [string[], string[]]) => (
    <div className="chart-row" role="group" aria-label={label}>
      {[right, left].map((teeth, side) => (
        <div key={side} className="chart-quadrant">
          {teeth.map((tooth) => (
            <Tooth
              key={tooth}
              tooth={tooth}
              actions={byTooth.get(tooth) ?? []}
              selected={selected === tooth}
              onSelect={editable ? (t) => setSelected(selected === t ? null : t) : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div className="dental-chart">
      <div className="chart-toolbar">
        <div className="segmented" role="group" aria-label="Dentition">
          {(['permanent', 'primary'] as const).map((d) => (
            <button
              key={d}
              type="button"
              className="segment"
              aria-pressed={dentition === d}
              onClick={() => {
                setDentition(d)
                setSelected(null)
              }}
            >
              {d === 'permanent' ? 'Permanent teeth' : 'Primary teeth'}
              {countIn(d) > 0 && <span className="segment-count">{countIn(d)}</span>}
            </button>
          ))}
        </div>
        {editable && !selected && <span className="muted">Select a tooth to mark an action.</span>}
      </div>

      <div className="chart-arches">
        <p className="chart-side" aria-hidden="true">
          <span>Right</span>
          <span>Upper</span>
          <span>Left</span>
        </p>
        {renderRow('Upper teeth', rows.upper)}
        <hr className="chart-occlusal" />
        {renderRow('Lower teeth', rows.lower)}
        <p className="chart-side" aria-hidden="true">
          <span>Right</span>
          <span>Lower</span>
          <span>Left</span>
        </p>
      </div>

      {onChange && selected && (
        <ActionPicker
          key={selected}
          visit={visit}
          tooth={selected}
          actionTypes={actionTypes}
          applied={byTooth.get(selected) ?? []}
          onChange={onChange}
          onCreateType={onCreateType}
          onClose={() => setSelected(null)}
        />
      )}

      <ChartLegend types={legendTypes(editable ? actionTypes : [], actions)} />

      {onChange && <ToothActionList visit={visit} onChange={onChange} />}
    </div>
  )
}

// Tooth outlines in a 40×64 box, drawn as an upper tooth: roots on top, crown
// at the bottom (toward the bite). Lower teeth are mirrored vertically.
const ROOTS: Record<ToothKind, string[]> = {
  incisor: ['M15 36C14.5 24 16.5 10 20 3C23.5 10 25.5 24 25 36Z'],
  canine: ['M14.5 36C14 22 16.5 6 20 .5C23.5 6 26 22 25.5 36Z'],
  premolar: ['M13 36C12.5 24 15 11 19 4H21C25 11 27.5 24 27 36Z'],
  molar: ['M7 36C6 25 7.5 13 11.5 5C14.5 11 16.5 24 18 36Z', 'M22 36C23.5 24 25.5 11 28.5 5C32.5 13 34 25 33 36Z'],
}
const CROWNS: Record<ToothKind, string> = {
  incisor: 'M12.5 34C11.5 44 12 54 14 60Q20 63 26 60C28 54 28.5 44 27.5 34Q20 32 12.5 34Z',
  canine: 'M11.5 34C10.5 44 12.5 53 20 62C27.5 53 29.5 44 28.5 34Q20 32 11.5 34Z',
  premolar: 'M9.5 34C8 44 9.5 54 13 59.5Q16.5 62.5 20 60.5Q23.5 62.5 27 59.5C30.5 54 32 44 30.5 34Q20 32 9.5 34Z',
  molar: 'M5 34C3.5 44 4.5 54 8 59.5Q11.5 62.5 15 60Q20 63 25 60Q28.5 62.5 32 59.5C35.5 54 36.5 44 35 34Q20 31.5 5 34Z',
}
const FISSURES: Partial<Record<ToothKind, string>> = {
  premolar: 'M14 52Q20 55 26 52',
  molar: 'M10 51Q15 54 20 51Q25 54 30 51M20 51V57',
}

function ToothImage({ tooth, colors }: { tooth: string; colors: string[] }) {
  const gradientId = `tooth-${useId().replace(/:/g, '')}`
  const kind = toothKind(tooth)
  const crownFill = colors.length === 0 ? 'var(--tooth-enamel)' : colors.length === 1 ? colors[0] : `url(#${gradientId})`
  return (
    <svg className="tooth-image" viewBox="0 0 40 64" aria-hidden="true" focusable="false">
      {colors.length > 1 && (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            {colorBands(colors).map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
      )}
      <g transform={isUpper(tooth) ? undefined : 'translate(0 64) scale(1 -1)'}>
        {ROOTS[kind].map((d) => (
          <path key={d} className="tooth-root" d={d} />
        ))}
        <path className="tooth-crown" d={CROWNS[kind]} fill={crownFill} data-fill={colors.length > 1 ? 'bands' : crownFill} />
        {FISSURES[kind] && <path className="tooth-fissure" d={FISSURES[kind]} />}
        {colors.length === 0 && <ellipse className="tooth-shine" cx="15" cy="42" rx="2.2" ry="5" />}
      </g>
    </svg>
  )
}

function Tooth({
  tooth,
  actions,
  selected,
  onSelect,
}: {
  tooth: string
  actions: VisitToothAction[]
  selected: boolean
  onSelect?: (tooth: string) => void
}) {
  const colors = actions.map((a) => a.action_type.color)
  const label = `Tooth ${tooth}: ${actions.length ? actions.map((a) => a.action_type.name).join(', ') : 'no actions'}`
  const className = [
    'tooth',
    `tooth-${toothKind(tooth)}`,
    isUpper(tooth) ? 'tooth-upper' : 'tooth-lower',
    actions.length ? 'tooth-marked' : '',
    selected ? 'tooth-selected' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const content = (
    <>
      <ToothImage tooth={tooth} colors={colors} />
      <span className="tooth-number">{tooth}</span>
    </>
  )

  if (!onSelect) {
    return (
      <span className={className} role="img" aria-label={label} title={label} data-tooth={tooth}>
        {content}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      data-tooth={tooth}
      onClick={() => onSelect(tooth)}
    >
      {content}
    </button>
  )
}

function chartError(error: unknown): string | null {
  if (!error) return null
  if (error instanceof ApiError) {
    return (
      error.field('action_type_id') ??
      error.field('tooth') ??
      error.field('notes') ??
      error.field('name') ??
      error.field('color') ??
      error.message
    )
  }
  return errorMessage(error)
}

/** Marks or unmarks actions on the selected tooth (CHART-002). */
function ActionPicker({
  visit,
  tooth,
  actionTypes,
  applied,
  onChange,
  onCreateType,
  onClose,
}: {
  visit: Visit
  tooth: string
  actionTypes: DentalActionType[]
  applied: VisitToothAction[]
  onChange: (visit: Visit) => void
  onCreateType?: (input: NewActionInput) => Promise<DentalActionType>
  onClose: () => void
}) {
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(() => suggestColor(actionTypes))

  async function run(action: () => Promise<void>) {
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

  const mark = async (type: DentalActionType) => {
    onChange(await api.addToothAction(visit.id, { tooth, action_type_id: type.id, notes: notes.trim() }))
    setNotes('')
  }

  function toggle(type: DentalActionType) {
    const existing = applied.find((a) => a.action_type.id === type.id)
    return run(async () => {
      if (existing) onChange(await api.removeToothAction(visit.id, existing.id))
      else await mark(type)
    })
  }

  /** Creates the new action type, then marks it on this tooth (CHART-006). */
  function createAndMark(event: FormEvent) {
    event.preventDefault()
    if (!onCreateType) return
    void run(async () => {
      const type = await onCreateType({ name: newName.trim(), color: newColor })
      setCreating(false)
      setNewName('')
      await mark(type)
    })
  }

  const message = chartError(error)
  return (
    <div className="action-picker" role="group" aria-label={`Actions for tooth ${tooth}`}>
      <div className="action-picker-head">
        <h3>Tooth {tooth}</h3>
        <button type="button" className="btn btn-link" onClick={onClose}>
          Done
        </button>
      </div>
      {actionTypes.length === 0 && !onCreateType ? (
        <EmptyState>No dental actions are configured. Ask an administrator to add them in Django Admin.</EmptyState>
      ) : (
        <>
          <div className="action-chips">
            {actionTypes.map((type) => {
              const isApplied = applied.some((a) => a.action_type.id === type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  className="action-chip"
                  aria-pressed={isApplied}
                  disabled={pending}
                  onClick={() => void toggle(type)}
                >
                  <span className="swatch" style={{ background: type.color }} aria-hidden="true" />
                  {type.name}
                </button>
              )
            })}
            {onCreateType && !creating && (
              <button type="button" className="action-chip action-chip-new" disabled={pending} onClick={() => setCreating(true)}>
                + New action
              </button>
            )}
          </div>
          {onCreateType && creating && (
            <form className="new-action" aria-label="New action" onSubmit={createAndMark}>
              <Field label="New action name" htmlFor="new_action_name" required>
                <input
                  id="new_action_name"
                  value={newName}
                  maxLength={150}
                  required
                  autoFocus
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="e.g. Veneer"
                />
              </Field>
              <Field label="Color" htmlFor="new_action_color">
                <input id="new_action_color" type="color" value={newColor} onChange={(event) => setNewColor(event.target.value.toUpperCase())} />
              </Field>
              <div className="new-action-buttons">
                <button type="submit" className="btn btn-secondary btn-small" disabled={pending || !newName.trim()}>
                  Add to tooth {tooth}
                </button>
                <button type="button" className="btn btn-link" onClick={() => setCreating(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          <Field label="Action notes" htmlFor="tooth_action_notes" hint="Optional, saved with the next action you mark, e.g. surfaces MO">
            <input id="tooth_action_notes" maxLength={255} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </>
      )}
      {message && (
        <div className="alert alert-error" role="alert">
          {message}
        </div>
      )}
    </div>
  )
}

/** Configured actions plus any retired ones still used in this visit. */
function legendTypes(configured: DentalActionType[], actions: VisitToothAction[]): DentalActionType[] {
  const types = new Map(configured.map((t) => [t.id, t]))
  for (const action of actions) if (!types.has(action.action_type.id)) types.set(action.action_type.id, action.action_type)
  return [...types.values()]
}

function ChartLegend({ types }: { types: DentalActionType[] }) {
  if (types.length === 0) return <p className="muted chart-empty">No teeth marked in this visit.</p>
  return (
    <ul className="chart-legend" aria-label="Chart legend">
      {types.map((type) => (
        <li key={type.id}>
          <span className="swatch" style={{ background: type.color }} aria-hidden="true" />
          {type.name}
        </li>
      ))}
    </ul>
  )
}

function ToothActionList({ visit, onChange }: { visit: Visit; onChange: (visit: Visit) => void }) {
  const [error, setError] = useState<unknown>(null)
  if (visit.tooth_actions.length === 0) return null
  return (
    <>
      <ul className="entry-list tooth-action-list" aria-label="Tooth actions">
        {visit.tooth_actions.map((entry) => (
          <li key={entry.id}>
            <span>
              <span className="badge badge-muted">Tooth {entry.tooth}</span>{' '}
              <span className="swatch" style={{ background: entry.action_type.color }} aria-hidden="true" />
              <strong>{entry.action_type.name}</strong>
              {entry.notes && <span className="muted"> — {entry.notes}</span>}
            </span>
            <button
              type="button"
              className="btn btn-link"
              aria-label={`Remove ${entry.action_type.name} from tooth ${entry.tooth}`}
              onClick={async () => {
                setError(null)
                try {
                  onChange(await api.removeToothAction(visit.id, entry.id))
                } catch (err) {
                  setError(err)
                }
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {!!error && (
        <div className="alert alert-error" role="alert">
          {errorMessage(error)}
        </div>
      )}
    </>
  )
}
