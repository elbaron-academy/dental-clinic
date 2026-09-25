import type { PatientInput } from '../../api/types'

export type PatientErrors = Partial<Record<keyof PatientInput | 'doctor', string>>

/** Client-side checks mirror PATIENT-001 and PATIENT-003; the API stays authoritative. */
export function validatePatient(input: PatientInput): PatientErrors {
  const errors: PatientErrors = {}
  if (!input.full_name.trim()) errors.full_name = 'Full name is required.'
  if (!input.phone.trim()) errors.phone = 'Phone number is required.'
  if (input.is_minor) {
    if (!input.guardian_name?.trim()) errors.guardian_name = 'Guardian name is required for a minor.'
    if (!input.guardian_phone?.trim()) errors.guardian_phone = 'Guardian phone is required for a minor.'
  }
  return errors
}
