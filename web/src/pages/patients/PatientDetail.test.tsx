import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { DentalActionType } from '../../api/types'
import { makeVisit } from '../../test/fixtures'
import { makeUser, mockApi, renderWithAuth } from '../../test/utils'
import { PatientDetail } from './PatientDetail'

const CROWN: DentalActionType = { id: 1, name: 'Crown', code: '', color: '#D97706' }
const CARIES: DentalActionType = { id: 2, name: 'Caries', code: '', color: '#DC2626' }
const doctor = makeUser({
  id: 10,
  role: 'DOCTOR',
  permissions: ['patients.view_patient', 'appointments.view_appointment', 'visits.view_visit'],
})
const patient = {
  id: 7,
  full_name: 'Hany Fathy',
  phone: '01112223333',
  is_minor: false,
  address: '',
  guardian_name: '',
  guardian_phone: '',
  doctors: [{ id: 10, full_name: 'Dr. Amal Hassan' }],
  created_at: '2026-09-25T08:00:00Z',
  updated_at: '2026-09-25T08:00:00Z',
}
const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results })

function renderPatient(visits: unknown[]) {
  mockApi({
    'GET /api/patients/7/': () => ({ body: patient }),
    'GET /api/appointments/': () => ({ body: page([]) }),
    'GET /api/visits/': () => ({ body: page(visits) }),
  })
  renderWithAuth(<PatientDetail />, { user: doctor, path: '/patients/7', route: '/patients/:id' })
}

describe('patient dental chart (CHART-007)', () => {
  it('shows the newest charted visit and switches between visits', async () => {
    renderPatient([
      makeVisit({ id: 5, started_at: '2026-09-27T10:00:00Z', tooth_actions: [{ id: 2, tooth: '21', action_type: CARIES, notes: '' }] }),
      makeVisit({ id: 4, started_at: '2026-09-26T10:00:00Z' }),
      makeVisit({ id: 3, started_at: '2026-09-20T10:00:00Z', status: 'COMPLETED', status_display: 'Completed', can_edit: false, tooth_actions: [{ id: 1, tooth: '11', action_type: CROWN, notes: '' }] }),
    ])
    const card = (await screen.findByRole('heading', { name: 'Dental chart', level: 2 })).closest('section')!
    expect(within(card).getByRole('img', { name: 'Tooth 21: Caries' })).toBeInTheDocument()
    const select = within(card).getByLabelText('Visit')
    expect(within(select).getAllByRole('option')).toHaveLength(2)
    await userEvent.selectOptions(select, '3')
    expect(within(card).getByRole('img', { name: 'Tooth 11: Crown' })).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'Tooth 21: no actions' })).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Open visit' })).toHaveAttribute('href', '/visits/3')
  })

  it('explains where teeth are charted when nothing is charted yet', async () => {
    renderPatient([makeVisit()])
    expect(await screen.findByText(/No teeth charted yet/)).toBeInTheDocument()
  })
})
