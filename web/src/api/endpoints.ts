import { apiRequest } from './client'
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  AppointmentUpdate,
  Balance,
  CatalogMedication,
  CatalogProcedure,
  DoctorSummary,
  LoginResponse,
  Me,
  Page,
  Patient,
  PatientInput,
  Payment,
  PaymentMethod,
  Queue,
  Role,
  Visit,
} from './types'

// Authentication (Sprint 02)
export const login = (phone: string, password: string, role?: Role) =>
  apiRequest<LoginResponse>('/auth/login/', { method: 'POST', body: { phone, password, role } })
export const logout = () => apiRequest<void>('/auth/logout/', { method: 'POST' })
export const getMe = () => apiRequest<Me>('/auth/me/')
export const getDoctors = () => apiRequest<DoctorSummary[]>('/doctors/')

// Patients (Sprint 03)
export const listPatients = (query: { search?: string; doctor?: number; page?: number } = {}) =>
  apiRequest<Page<Patient>>('/patients/', { query })
export const getPatient = (id: number) => apiRequest<Patient>(`/patients/${id}/`)
export const createPatient = (input: PatientInput) =>
  apiRequest<Patient>('/patients/', { method: 'POST', body: input })
export const updatePatient = (id: number, input: Partial<PatientInput>) =>
  apiRequest<Patient>(`/patients/${id}/`, { method: 'PATCH', body: input })
export const getPatientBalance = (id: number) => apiRequest<Balance>(`/patients/${id}/balance/`)

// Appointments (Sprint 04)
export interface AppointmentQuery {
  status?: AppointmentStatus[]
  doctor?: number
  patient?: number
  scheduled_from?: string
  scheduled_to?: string
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}
export const listAppointments = ({ status, ...rest }: AppointmentQuery = {}) =>
  apiRequest<Page<Appointment>>('/appointments/', {
    query: { ...rest, status: status?.length ? status.join(',') : undefined },
  })
export const getAppointment = (id: number) => apiRequest<Appointment>(`/appointments/${id}/`)
export const createAppointment = (input: AppointmentInput) =>
  apiRequest<Appointment>('/appointments/', { method: 'POST', body: input })
export const updateAppointment = (id: number, input: AppointmentUpdate) =>
  apiRequest<Appointment>(`/appointments/${id}/`, { method: 'PATCH', body: input })
export const checkIn = (id: number) =>
  apiRequest<Appointment>(`/appointments/${id}/check-in/`, { method: 'POST' })
export const cancelAppointment = (id: number) =>
  apiRequest<Appointment>(`/appointments/${id}/cancel/`, { method: 'POST' })
export const startVisit = (id: number) =>
  apiRequest<Appointment>(`/appointments/${id}/start-visit/`, { method: 'POST' })
export const getQueue = (doctor?: number) => apiRequest<Queue>('/appointments/queue/', { query: { doctor } })

// Visits and catalog (Sprint 05)
export const listVisits = (query: { patient?: number; doctor?: number; status?: string; page?: number } = {}) =>
  apiRequest<Page<Visit>>('/visits/', { query })
export const getVisit = (id: number) => apiRequest<Visit>(`/visits/${id}/`)
export const updateVisit = (id: number, input: Partial<Pick<Visit, 'notes' | 'diagnosis' | 'treatment'>>) =>
  apiRequest<Visit>(`/visits/${id}/`, { method: 'PATCH', body: input })
export const addProcedure = (id: number, input: { procedure_id?: number | null; tooth?: string; notes?: string }) =>
  apiRequest<Visit>(`/visits/${id}/procedures/`, { method: 'POST', body: input })
export const removeProcedure = (id: number, entryId: number) =>
  apiRequest<Visit>(`/visits/${id}/procedures/${entryId}/`, { method: 'DELETE' })
export const addMedication = (id: number, input: { medication_id: number; quantity: string; duration: string }) =>
  apiRequest<Visit>(`/visits/${id}/medications/`, { method: 'POST', body: input })
export const removeMedication = (id: number, entryId: number) =>
  apiRequest<Visit>(`/visits/${id}/medications/${entryId}/`, { method: 'DELETE' })
export const addFollowUp = (id: number, input: { scheduled_at: string; notes?: string }) =>
  apiRequest<Visit>(`/visits/${id}/follow-ups/`, { method: 'POST', body: input })
export const completeVisit = (id: number) =>
  apiRequest<Visit>(`/visits/${id}/complete/`, { method: 'POST' })
export const listProcedures = () => apiRequest<CatalogProcedure[]>('/catalog/procedures/')
export const listMedications = () => apiRequest<CatalogMedication[]>('/catalog/medications/')

// Payments (Sprint 06)
export const setAmountDue = (appointmentId: number, amountDue: string) =>
  apiRequest<Appointment>(`/appointments/${appointmentId}/amount-due/`, {
    method: 'POST',
    body: { amount_due: amountDue },
  })
export const listPayments = (query: { appointment?: number; patient?: number }) =>
  apiRequest<Page<Payment>>('/payments/', { query: { ...query, page_size: 200 } })
export const recordPayment = (input: { appointment_id: number; amount: string; method_id: number; note?: string }) =>
  apiRequest<Payment>('/payments/', { method: 'POST', body: input })
export const listPaymentMethods = () => apiRequest<PaymentMethod[]>('/payment-methods/')
