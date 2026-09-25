import type { Appointment, Visit } from '../api/types'

export function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 5,
    patient: { id: 7, full_name: 'Hany Fathy', phone: '01112223333', is_minor: false },
    doctor: { id: 10, full_name: 'Dr. Amal Hassan' },
    scheduled_at: '2026-09-25T10:00:00Z',
    status: 'SCHEDULED',
    status_display: 'Scheduled',
    notes: '',
    follow_up_of: null,
    visit_id: null,
    billing: null,
    checked_in_at: null,
    cancelled_at: null,
    created_at: '2026-09-25T08:00:00Z',
    ...overrides,
  }
}

export function makeVisit(overrides: Partial<Visit> = {}): Visit {
  return {
    id: 3,
    status: 'ACTIVE',
    status_display: 'Active',
    patient: { id: 7, full_name: 'Hany Fathy', phone: '01112223333', is_minor: false },
    doctor: { id: 10, full_name: 'Dr. Amal Hassan' },
    appointment: 5,
    started_at: '2026-09-25T10:05:00Z',
    completed_at: null,
    notes: '',
    diagnosis: '',
    treatment: '',
    procedures: [],
    medications: [],
    follow_ups: [],
    can_edit: true,
    ...overrides,
  }
}
