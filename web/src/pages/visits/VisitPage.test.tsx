import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeVisit } from '../../test/fixtures'
import { makeUser, mockApi, renderWithAuth } from '../../test/utils'
import { VisitPage } from './VisitPage'

const doctor = makeUser({
  id: 10,
  role: 'DOCTOR',
  permissions: ['visits.view_visit', 'visits.record_visit', 'visits.complete_visit'],
})

describe('visit page (VISIT-001..007)', () => {
  it('lets the owning doctor record and complete the visit', async () => {
    const visit = makeVisit()
    const { calls } = mockApi({
      'GET /api/visits/3/': () => ({ body: visit }),
      'GET /api/catalog/procedures/': () => ({ body: [{ id: 1, name: 'Composite filling', code: 'D2391' }] }),
      'GET /api/catalog/medications/': () => ({ body: [{ id: 2, name: 'Amoxicillin', details: '500 mg' }] }),
      'PATCH /api/visits/3/': () => ({ body: { ...visit, diagnosis: 'Caries' } }),
      'POST /api/visits/3/complete/': () => ({
        body: { ...visit, diagnosis: 'Caries', status: 'COMPLETED', status_display: 'Completed', can_edit: false },
      }),
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderWithAuth(<VisitPage />, { user: doctor, path: '/visits/3', route: '/visits/:id' })
    await userEvent.type(await screen.findByLabelText('Diagnosis'), 'Caries')
    await userEvent.click(screen.getByRole('button', { name: 'Complete visit' }))
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
})
