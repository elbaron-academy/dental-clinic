import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DentalActionType, Visit, VisitToothAction } from '../api/types'
import { makeVisit } from '../test/fixtures'
import { mockApi } from '../test/utils'
import { DentalChart } from './DentalChart'

const FILLING: DentalActionType = { id: 1, name: 'Filling', code: 'D2391', color: '#2563EB' }
const EXTRACTION: DentalActionType = { id: 2, name: 'Extraction', code: 'D7140', color: '#475569' }
const CARIES: DentalActionType = { id: 3, name: 'Caries', code: '', color: '#DC2626' }
const TYPES = [CARIES, EXTRACTION, FILLING]

const action = (id: number, tooth: string, type: DentalActionType, notes = ''): VisitToothAction => ({
  id,
  tooth,
  action_type: type,
  notes,
})

describe('dental chart (CHART-001..004)', () => {
  it('shows all 32 permanent teeth and switches to the 20 primary teeth', async () => {
    render(<DentalChart visit={makeVisit()} actionTypes={TYPES} onChange={vi.fn()} />)
    const upper = screen.getByRole('group', { name: 'Upper teeth' })
    const lower = screen.getByRole('group', { name: 'Lower teeth' })
    expect(within(upper).getAllByRole('button')).toHaveLength(16)
    expect(within(lower).getAllByRole('button')).toHaveLength(16)
    expect(within(upper).getAllByRole('button')[0]).toHaveAccessibleName('Tooth 18: no actions')
    expect(within(lower).getAllByRole('button').at(-1)).toHaveAccessibleName('Tooth 38: no actions')

    await userEvent.click(screen.getByRole('button', { name: 'Primary teeth' }))
    expect(within(screen.getByRole('group', { name: 'Upper teeth' })).getAllByRole('button')).toHaveLength(10)
    expect(screen.getByRole('button', { name: 'Tooth 55: no actions' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Tooth 36:/ })).not.toBeInTheDocument()
  })

  it('colors marked teeth with their action colors and shows the legend', () => {
    const visit = makeVisit({ tooth_actions: [action(1, '36', FILLING), action(2, '11', FILLING), action(3, '11', EXTRACTION)] })
    render(<DentalChart visit={visit} actionTypes={TYPES} onChange={vi.fn()} />)
    const single = screen.getByRole('button', { name: 'Tooth 36: Filling' })
    expect(single).toHaveStyle({ background: '#2563EB' })
    const multi = screen.getByRole('button', { name: 'Tooth 11: Filling, Extraction' })
    expect(multi.getAttribute('style')).toContain('linear-gradient')
    expect(multi).toHaveClass('tooth-multi')
    const legend = screen.getByRole('list', { name: 'Chart legend' })
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Caries', 'Extraction', 'Filling'])
  })

  it('marks an action on the selected tooth with notes', async () => {
    const visit = makeVisit()
    const updated = { ...visit, tooth_actions: [action(9, '36', FILLING, 'MO')] }
    const { calls } = mockApi({ 'POST /api/visits/3/tooth-actions/': () => ({ status: 201, body: updated }) })
    const onChange = vi.fn()
    render(<DentalChart visit={visit} actionTypes={TYPES} onChange={onChange} />)
    expect(screen.queryByRole('group', { name: /Actions for tooth/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tooth 36: no actions' }))
    expect(screen.getByRole('button', { name: 'Tooth 36: no actions' })).toHaveAttribute('aria-pressed', 'true')
    const picker = screen.getByRole('group', { name: 'Actions for tooth 36' })
    await userEvent.type(within(picker).getByLabelText('Action notes'), 'MO')
    await userEvent.click(within(picker).getByRole('button', { name: 'Filling' }))
    expect(calls.at(-1)).toEqual({
      method: 'POST',
      path: '/api/visits/3/tooth-actions/',
      body: { tooth: '36', action_type_id: 1, notes: 'MO' },
    })
    expect(onChange).toHaveBeenCalledWith(updated)
  })

  it('unmarks an applied action from the picker and from the list', async () => {
    const visit = makeVisit({ tooth_actions: [action(9, '36', FILLING)] })
    const cleared: Visit = { ...visit, tooth_actions: [] }
    const { calls } = mockApi({ 'DELETE /api/visits/3/tooth-actions/9/': () => ({ body: cleared }) })
    const onChange = vi.fn()
    render(<DentalChart visit={visit} actionTypes={TYPES} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tooth 36: Filling' }))
    const chip = within(screen.getByRole('group', { name: 'Actions for tooth 36' })).getByRole('button', { name: 'Filling' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(chip)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Filling from tooth 36' }))
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(2)
    expect(onChange).toHaveBeenLastCalledWith(cleared)
  })

  it('shows the API error when an action cannot be marked', async () => {
    mockApi({
      'POST /api/visits/3/tooth-actions/': () => ({
        status: 409,
        body: { detail: 'Completed visits cannot be changed.', code: 'visit_completed' },
      }),
    })
    render(<DentalChart visit={makeVisit()} actionTypes={TYPES} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tooth 11: no actions' }))
    await userEvent.click(screen.getByRole('button', { name: 'Caries' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Completed visits cannot be changed.')
  })

  it('opens on the primary teeth when only primary teeth are marked', () => {
    render(<DentalChart visit={makeVisit({ tooth_actions: [action(1, '55', CARIES)] })} />)
    expect(screen.getByRole('button', { name: /Primary teeth/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('img', { name: 'Tooth 55: Caries' })).toBeInTheDocument()
  })

  it('is read-only without onChange: no tooth buttons, no picker, legend from the visit', async () => {
    const visit = makeVisit({ can_edit: false, tooth_actions: [action(1, '36', FILLING)] })
    render(<DentalChart visit={visit} />)
    expect(screen.queryByRole('button', { name: /^Tooth / })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Tooth 36: Filling' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /no actions/ })).toHaveLength(31)
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Chart legend' })).getByText('Filling')).toBeInTheDocument()
  })

  it('says so when nothing is marked in a read-only chart', () => {
    render(<DentalChart visit={makeVisit({ can_edit: false })} />)
    expect(screen.getByText('No teeth marked in this visit.')).toBeInTheDocument()
  })

  it('lets the doctor add a new action and marks it on the tooth (CHART-006)', async () => {
    const visit = makeVisit()
    const veneer: DentalActionType = { id: 7, name: 'Veneer', code: '', color: '#DB2777' }
    const marked = { ...visit, tooth_actions: [action(11, '21', veneer)] }
    const { calls } = mockApi({ 'POST /api/visits/3/tooth-actions/': () => ({ status: 201, body: marked }) })
    const onCreateType = vi.fn(async () => veneer)
    const onChange = vi.fn()
    render(<DentalChart visit={visit} actionTypes={TYPES} onChange={onChange} onCreateType={onCreateType} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tooth 21: no actions' }))
    await userEvent.click(screen.getByRole('button', { name: '+ New action' }))
    const form = screen.getByRole('form', { name: 'New action' })
    expect(within(form).getByRole('button', { name: 'Add to tooth 21' })).toBeDisabled()
    // The first suggested color that no action uses yet.
    expect(within(form).getByLabelText('Color')).toHaveValue('#db2777')
    await userEvent.type(within(form).getByLabelText(/New action name/), ' Veneer ')
    await userEvent.click(within(form).getByRole('button', { name: 'Add to tooth 21' }))
    expect(onCreateType).toHaveBeenCalledWith({ name: 'Veneer', color: '#DB2777' })
    expect(calls.at(-1)?.body).toEqual({ tooth: '21', action_type_id: 7, notes: '' })
    expect(onChange).toHaveBeenCalledWith(marked)
    expect(screen.queryByRole('form', { name: 'New action' })).not.toBeInTheDocument()
  })

  it('shows why a new action was refused', async () => {
    const { ApiError } = await import('../api/client')
    const onCreateType = vi.fn(async () => {
      throw new ApiError(400, 'Please correct the highlighted fields.', undefined, { name: ['An action with this name already exists.'] })
    })
    render(<DentalChart visit={makeVisit()} actionTypes={TYPES} onChange={vi.fn()} onCreateType={onCreateType} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tooth 21: no actions' }))
    await userEvent.click(screen.getByRole('button', { name: '+ New action' }))
    await userEvent.type(screen.getByLabelText(/New action name/), 'Filling')
    await userEvent.click(screen.getByRole('button', { name: 'Add to tooth 21' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('An action with this name already exists.')
  })

  it('has no New action button without the permission', async () => {
    render(<DentalChart visit={makeVisit()} actionTypes={TYPES} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tooth 21: no actions' }))
    expect(screen.queryByRole('button', { name: '+ New action' })).not.toBeInTheDocument()
  })
})
