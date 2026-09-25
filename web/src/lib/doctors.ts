import type { DoctorSummary } from '../api/types'

/** The doctor id to send: the chosen one, or the only permitted doctor. */
export function resolveDoctor(doctors: DoctorSummary[], value: number | ''): number | undefined {
  if (value !== '') return value
  return doctors.length === 1 ? doctors[0].id : undefined
}
