import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeVisit } from '../../test/fixtures'
import { makeUser, mockApi, renderWithAuth } from '../../test/utils'
import { VisitPage } from './VisitPage'

const doctor = makeUser({
  id: 10,
  role: 'DOCTOR',
  permissions: ['visits.view_visit', 'visits.record_visit', 'visits.complete_visit', 'catalog.add_dentalactiontype'],
})

const FILLING = { id: 4, name: 'Filling', code: 'D2391', color: '#2563EB' }

describe('visit page (VISIT-001..007)', () => {
  it('lets the owning doctor record and complete the visit', async () => {
    const visit = makeVisit()
    const { calls } = mockApi({
      'GET /api/visits/3/': () => ({ body: visit }),
      'GET /api/catalog/procedures/': () => ({ body: [{ id: 1, name: 'Composite filling', code: 'D2391' }] }),
      'GET /api/catalog/medications/': () => ({ body: [{ id: 2, name: 'Amoxicillin', details: '500 mg' }] }),
      'GET /api/catalog/dental-actions/': () => ({ body: [FILLING] }),
      'PATCH /api/visits/3/': () => ({ body: { ...visit, diagnosis: 'Caries' } }),
      'POST /api/visits/3/complete/': () => ({
        body: { ...visit, diagnosis: 'Caries', status: 'COMPLETED', status_display: 'Completed', can_edit: false },
      }),
    })
    renderWithAuth(<VisitPage />, { user: doctor, path: '/visits/3', route: '/visits/:id' })
    await userEvent.type(await screen.findByLabelText('Diagnosis'), 'Caries')
    await userEvent.click(screen.getByRole('button', { name: 'Complete visit' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Complete this visit?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, complete' }))
    expect(await screen.findByText(/completed and kept in the patient's history/)).toBeInTheDocument()
    const methods = calls.map((c) => `${c.method} ${c.path}`)
    expect(methods).toContain('PATCH /api/visits/3/')
    expect(methods.indexOf('PATCH /api/visits/3/')).toBeLessThan(methods.indexOf('POST /api/visits/3/complete/'))
  })

  it('adds a medication with quantity and duration', async () => {
    const visit = makeVisit()
    const { calls } = mockApi({
      'GET /api/visits/3/': () => ({ body: visit }),
      'GET /api/catalog/procedures/': () => ({ body: [] }),
      'GET /api/catalog/medications/': () => ({ body: [{ id: 2, name: 'Amoxicillin', details: '500 mg' }] }),
      'GET /api/catalog/dental-actions/': () => ({ body: [FILLING] }),
      'POST /api/visits/3/medications/': () => ({
        status: 201,
        body: {
          ...visit,
          medications: [{ id: 9, medication: { id: 2, name: 'Amoxicillin', details: '500 mg' }, quantity: '21 capsules', duration: '7 days' }],
        },
      }),
    })
    renderWithAuth(<VisitPage />, { user: doctor, path: '/visits/3', route: '/visits/:id' })
    await screen.findByRole('option', { name: /Amoxicillin/ })
    await userEvent.selectOptions(screen.getByLabelText(/^Medication/), '2')
    await userEvent.type(screen.getByLabelText(/^Quantity/), '21 capsules')
    await userEvent.type(screen.getByLabelText(/^Duration/), '7 days')
    await userEvent.click(screen.getByRole('button', { name: 'Add medication' }))
    expect(await screen.findByText(/21 capsules, 7 days/)).toBeInTheDocument()
    expect(calls.at(-1)?.body).toEqual({ medication_id: 2, quantity: '21 capsules', duration: '7 days' })
  })

  it('shows a read-only record to others', async () => {
    mockApi({
      'GET /api/visits/3/': () => ({ body: makeVisit({ can_edit: false, diagnosis: 'Gingivitis' }) }),
    })
    const assistant = makeUser({ role: 'ASSISTANT', permissions: ['visits.view_visit'] })
    renderWithAuth(<VisitPage />, { user: assistant, path: '/visits/3', route: '/visits/:id' })
    expect(await screen.findByText('Gingivitis')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete visit' })).not.toBeInTheDocument()
    expect(screen.getByText(/Only they can change it/)).toBeInTheDocument()
  })

  it('lets the owning doctor mark teeth on the dental chart (CHART-002)', async () => {
    const visit = makeVisit()
    const { calls } = mockApi({
      'GET /api/visits/3/': () => ({ body: visit }),
      'GET /api/catalog/procedures/': () => ({ body: [] }),
      'GET /api/catalog/medications/': () => ({ body: [] }),
      'GET /api/catalog/dental-actions/': () => ({ body: [FILLING] }),
      'POST /api/visits/3/tooth-actions/': () => ({
        status: 201,
        body: { ...visit, tooth_actions: [{ id: 8, tooth: '26', action_type: FILLING, notes: '' }] },
      }),
    })
    renderWithAuth(<VisitPage />, { user: doctor, path: '/visits/3', route: '/visits/:id' })
    await userEvent.click(await screen.findByRole('button', { name: 'Tooth 26: no actions' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Filling' }))
    expect(await screen.findByRole('button', { name: 'Tooth 26: Filling' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Tooth actions' })).toHaveTextContent('Tooth 26')
    expect(calls.at(-1)?.body).toEqual({ tooth: '26', action_type_id: 4, notes: '' })
  })

  it('shows a read-only dental chart to others', async () => {
    mockApi({
      'GET /api/visits/3/': () => ({
        body: makeVisit({ can_edit: false, tooth_actions: [{ id: 8, tooth: '26', action_type: FILLING, notes: 'MO' }] }),
      }),
    })
    const assistant = makeUser({ role: 'ASSISTANT', permissions: ['visits.view_visit'] })
    renderWithAuth(<VisitPage />, { user: assistant, path: '/visits/3', route: '/visits/:id' })
    expect(await screen.findByRole('img', { name: 'Tooth 26: Filling' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Tooth actions' })).toHaveTextContent('Filling')
    expect(screen.queryByRole('button', { name: /^Tooth / })).not.toBeInTheDocument()
  })

  it('the doctor creates a new action from the chart and it is marked on the tooth (CHART-006)', async () => {
    const visit = makeVisit()
    const veneer = { id: 9, name: 'Veneer', code: '', color: '#DB2777' }
    const { calls } = mockApi({
      'GET /api/visits/3/': () => ({ body: visit }),
      'GET /api/catalog/procedures/': () => ({ body: [] }),
      'GET /api/catalog/medications/': () => ({ body: [] }),
      'GET /api/catalog/dental-actions/': () => ({ body: [FILLING] }),
      'POST /api/catalog/dental-actions/': () => ({ status: 201, body: veneer }),
      'POST /api/visits/3/tooth-actions/': () => ({
        status: 201,
        body: { ...visit, tooth_actions: [{ id: 8, tooth: '11', action_type: veneer, notes: '' }] },
      }),
    })
    renderWithAuth(<VisitPage />, { user: doctor, path: '/visits/3', route: '/visits/:id' })
    await userEvent.click(await screen.findByRole('button', { name: 'Tooth 11: no actions' }))
    await userEvent.click(await screen.findByRole('button', { name: '+ New action' }))
    await userEvent.type(screen.getByLabelText(/New action name/), 'Veneer')
    await userEvent.click(screen.getByRole('button', { name: 'Add to tooth 11' }))
    expect(await screen.findByRole('button', { name: 'Tooth 11: Veneer' })).toBeInTheDocument()
    // The new action joins the picker and the legend.
    expect(screen.getByRole('button', { name: 'Veneer' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('list', { name: 'Chart legend' })).toHaveTextContent('Veneer')
    const posts = calls.filter((c) => c.method === 'POST').map((c) => c.path)
    expect(posts).toEqual(['/api/catalog/dental-actions/', '/api/visits/3/tooth-actions/'])
  })
})
