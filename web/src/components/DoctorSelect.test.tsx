import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { resolveDoctor } from '../lib/doctors'
import { DoctorSelect } from './DoctorSelect'

const amal = { id: 1, full_name: 'Dr. Amal' }
const omar = { id: 2, full_name: 'Dr. Omar' }

describe('DoctorSelect (CLINIC-002 / CLINIC-003)', () => {
  it('selects the only doctor automatically', () => {
    render(<DoctorSelect doctors={[amal]} value="" onChange={vi.fn()} />)
    expect(screen.getByTestId('auto-doctor')).toHaveTextContent('Dr. Amal (selected automatically)')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(resolveDoctor([amal], '')).toBe(1)
  })

  it('asks to choose among several doctors', () => {
    render(<DoctorSelect doctors={[amal, omar]} value="" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /Doctor/ })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(resolveDoctor([amal, omar], '')).toBeUndefined()
    expect(resolveDoctor([amal, omar], 2)).toBe(2)
  })

  it('explains when no doctor is assigned', () => {
    render(<DoctorSelect doctors={[]} value="" onChange={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('not assigned to any doctor')
  })
})
