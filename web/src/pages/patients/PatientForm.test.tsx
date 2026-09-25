import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeUser, mockApi, renderWithAuth } from '../../test/utils'
import { PatientFormPage } from './PatientForm'
import { validatePatient } from './validation'

describe('patient registration (PATIENT-001..003)', () => {
  it('validates name, phone and guardian for minors', () => {
    expect(validatePatient({ full_name: '', phone: '' })).toEqual({
      full_name: 'Full name is required.',
      phone: 'Phone number is required.',
    })
    expect(validatePatient({ full_name: 'A', phone: '1', is_minor: true })).toEqual({
      guardian_name: 'Guardian name is required for a minor.',
      guardian_phone: 'Guardian phone is required for a minor.',
    })
    expect(validatePatient({ full_name: 'A', phone: '1', address: '' })).toEqual({})
  })

  it('shows guardian fields only for a minor', async () => {
    mockApi({})
    renderWithAuth(<PatientFormPage />)
    expect(screen.queryByLabelText(/Guardian name/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Patient is a minor'))
    expect(screen.getByLabelText(/Guardian name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Guardian phone/)).toBeInTheDocument()
  })

  it('registers with the automatically selected doctor', async () => {
    const { calls } = mockApi({
      'POST /api/patients/': () => ({ status: 201, body: { id: 42 } }),
    })
    renderWithAuth(<PatientFormPage />)
    await userEvent.type(screen.getByLabelText(/Full name/), 'Mona Adel')
    await userEvent.type(screen.getByLabelText(/Phone number/), '0122 333 4444')
    await userEvent.type(screen.getByLabelText(/Address/), 'Cairo')
    await userEvent.click(screen.getByRole('button', { name: 'Register patient' }))
    expect(await screen.findByText('Patient page')).toBeInTheDocument()
    expect(calls[0].body).toMatchObject({
      full_name: 'Mona Adel',
      phone: '0122 333 4444',
      address: 'Cairo',
      doctor_ids: [10],
    })
  })

  it('requires choosing a doctor when several are permitted', async () => {
    const { calls } = mockApi({})
    const user = makeUser({
      permitted_doctors: [
        { id: 10, full_name: 'Dr. Amal' },
        { id: 11, full_name: 'Dr. Omar' },
      ],
    })
    renderWithAuth(<PatientFormPage />, { user })
    await userEvent.type(screen.getByLabelText(/Full name/), 'Mona')
    await userEvent.type(screen.getByLabelText(/Phone number/), '0122')
    await userEvent.click(screen.getByRole('button', { name: 'Register patient' }))
    expect(screen.getByText('Select a doctor.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('shows field errors returned by the API', async () => {
    mockApi({
      'POST /api/patients/': () => ({ status: 400, body: { phone: ['Enter a valid phone number.'] } }),
    })
    renderWithAuth(<PatientFormPage />)
    await userEvent.type(screen.getByLabelText(/Full name/), 'Mona')
    await userEvent.type(screen.getByLabelText(/Phone number/), '12ab')
    await userEvent.click(screen.getByRole('button', { name: 'Register patient' }))
    expect(await screen.findByText('Enter a valid phone number.')).toBeInTheDocument()
  })
})
