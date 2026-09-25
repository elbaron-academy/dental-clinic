// Types mirror docs/API.md (approved API contract v1).

export type Role = 'DOCTOR' | 'ASSISTANT' | 'RECEPTIONIST'

export interface DoctorSummary {
  id: number
  full_name: string
}

export interface Me {
  id: number
  phone: string
  full_name: string
  role: Role
  role_display: string
  clinic: { id: number; name: string; doctor_count: number }
  permissions: string[]
  permitted_doctors: DoctorSummary[]
}

export interface LoginResponse {
  token: string
  user: Me
}

export interface Page<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface PatientSummary {
  id: number
  full_name: string
  phone: string
  is_minor: boolean
}

export interface Patient extends PatientSummary {
  address: string
  guardian_name: string
  guardian_phone: string
  doctors: DoctorSummary[]
  created_at: string
  updated_at: string
}

export interface PatientInput {
  full_name: string
  phone: string
  address?: string
  is_minor?: boolean
  guardian_name?: string
  guardian_phone?: string
  doctor_ids?: number[]
}

export type AppointmentStatus = 'SCHEDULED' | 'CHECKED_IN' | 'IN_VISIT' | 'COMPLETED' | 'CANCELLED'
export type PaymentStatus = 'NOT_SET' | 'PENDING' | 'PAID'

export interface Billing {
  amount_due: string | null
  amount_paid: string
  remaining_amount: string | null
  payment_status: PaymentStatus
  payment_status_display: string
}

export interface Appointment {
  id: number
  patient: PatientSummary
  doctor: DoctorSummary
  scheduled_at: string
  status: AppointmentStatus
  status_display: string
  notes: string
  follow_up_of: number | null
  visit_id: number | null
  billing: Billing | null
  checked_in_at: string | null
  cancelled_at: string | null
  created_at: string
}

export interface AppointmentInput {
  patient_id: number
  doctor_id?: number
  scheduled_at: string
  notes?: string
}

export interface AppointmentUpdate {
  doctor_id?: number
  scheduled_at?: string
  notes?: string
}

export interface Queue {
  waiting: Appointment[]
  in_visit: Appointment[]
}

export interface CatalogProcedure {
  id: number
  name: string
  code: string
}

export interface CatalogMedication {
  id: number
  name: string
  details: string
}

export interface VisitProcedure {
  id: number
  procedure: CatalogProcedure | null
  tooth: string
  notes: string
}

export interface VisitMedication {
  id: number
  medication: CatalogMedication
  quantity: string
  duration: string
}

export interface FollowUp {
  id: number
  scheduled_at: string
  notes: string
  status: AppointmentStatus
  status_display: string
}

export type VisitStatus = 'ACTIVE' | 'COMPLETED'

export interface Visit {
  id: number
  status: VisitStatus
  status_display: string
  patient: PatientSummary
  doctor: DoctorSummary
  appointment: number
  started_at: string
  completed_at: string | null
  notes: string
  diagnosis: string
  treatment: string
  procedures: VisitProcedure[]
  medications: VisitMedication[]
  follow_ups: FollowUp[]
  can_edit: boolean
}

export interface PaymentMethod {
  id: number
  name: string
  code: string
}

export interface Payment {
  id: number
  appointment_id: number
  amount: string
  method: PaymentMethod
  note: string
  received_by: string | null
  received_at: string
}

export interface Balance {
  amount_due: string
  amount_paid: string
  remaining_amount: string
  appointments_pending: number
  appointments_not_set: number
}
