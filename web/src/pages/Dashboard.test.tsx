import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeAppointment } from '../test/fixtures'
import { makeUser, mockApi, renderWithAuth } from '../test/utils'
import { Dashboard } from './Dashboard'

const page = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results })

describe('role dashboards (APPT-002..005)', () => {
  it('reception sees the queue, today and registration actions', async () => {
    const waiting = makeAppointment({ id: 1, status: 'CHECKED_IN', status_display: 'Waiting for doctor', checked_in_at: '2026-09-25T09:55:00Z' })
    const scheduled = makeAppointment({ id: 2, patient: { id: 8, full_name: 'Mona Adel', phone: '0122', is_minor: false } })
    mockApi({
      'GET /api/appointments/queue/': () => ({ body: { waiting: [waiting], in_visit: [] } }),
      'GET /api/appointments/': () => ({ body: page([waiting, scheduled]) }),
    })
    renderWithAuth(<Dashboard role="RECEPTIONIST" />)
    const queue = await screen.findByRole('list', { name: 'Waiting for doctor' })
    expect(within(queue).getByText('Hany Fathy')).toBeInTheDocument()
    expect(within(queue).getByRole('button', { name: 'Start visit' })).toBeInTheDocument()
    const today = screen.getByRole('list', { name: "Today's appointments" })
    expect(within(today).getByRole('button', { name: 'Check in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Register patient' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New appointment' })).toBeInTheDocument()
  })

  it('shows the active-visit protection message from the API', async () => {
    const waiting = makeAppointment({ id: 1, status: 'CHECKED_IN', status_display: 'Waiting for doctor' })
    mockApi({
      'GET /api/appointments/queue/': () => ({ body: { waiting: [waiting], in_visit: [] } }),
      'GET /api/appointments/': () => ({ body: page([]) }),
      'POST /api/appointments/1/start-visit/': () => ({
        status: 409,
        body: { detail: 'This patient is already in an active visit.', code: 'active_visit_exists' },
      }),
    })
    renderWithAuth(<Dashboard role="RECEPTIONIST" />)
    await userEvent.click(await screen.findByRole('button', { name: 'Start visit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already in an active visit')
  })

  it('assistants get a read-only view', async () => {
    const waiting = makeAppointment({ id: 1, status: 'CHECKED_IN', status_display: 'Waiting for doctor' })
    mockApi({
      'GET /api/appointments/queue/': () => ({ body: { waiting: [waiting], in_visit: [] } }),
      'GET /api/appointments/': () => ({ body: page([makeAppointment({ id: 2 })]) }),
    })
    const assistant = makeUser({
      role: 'ASSISTANT',
      permissions: ['patients.view_patient', 'appointments.view_appointment', 'visits.view_visit'],
    })
    renderWithAuth(<Dashboard role="ASSISTANT" />, { user: assistant })
    expect(await screen.findAllByText('Hany Fathy')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Start visit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Register patient' })).not.toBeInTheDocument()
  })
})
