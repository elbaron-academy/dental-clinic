import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const PASSWORD = 'demo-pass-123'

/** Demo accounts created by `manage.py seed_demo`. */
export const USERS = {
  amal: { phone: '01000000001', name: 'Dr. Amal Hassan', role: 'DOCTOR', portal: 'doctor' },
  omar: { phone: '01000000002', name: 'Dr. Omar Nabil', role: 'DOCTOR', portal: 'doctor' },
  sara: { phone: '01000000003', name: 'Sara Mostafa', role: 'ASSISTANT', portal: 'assistant' },
  rana: { phone: '01000000004', name: 'Rana Adel', role: 'RECEPTIONIST', portal: 'reception' },
  youssef: { phone: '01000000011', name: 'Dr. Youssef Kamal', role: 'DOCTOR', portal: 'doctor' },
  mai: { phone: '01000000014', name: 'Mai Hamdy', role: 'RECEPTIONIST', portal: 'reception' },
} as const

export type DemoUser = (typeof USERS)[keyof typeof USERS]

let counter = 0
/** A patient name unique to this run, so tests never collide. */
export function uniqueName(prefix = 'Patient'): string {
  counter += 1
  return `${prefix} ${Date.now().toString(36)}${counter}`
}

export function uniquePhone(): string {
  return `015${String(Date.now() + counter++).slice(-8)}`
}

/** Signs in through the role's own login page. */
export async function loginAs(page: Page, user: DemoUser) {
  await page.goto(`/login/${user.portal}`)
  await page.getByLabel('Phone number').fill(user.phone)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL((url) => url.pathname === `/${user.portal}`)
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
}

/** The status badge in the page header (appointment and visit pages). */
export function statusBadge(page: Page) {
  return page.locator('.page-header .badge')
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login\/[a-z]+$/)
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
}

/** Direct API access for test setup (the UI under test stays the PWA). */
export class Api {
  private constructor(
    private readonly request: APIRequestContext,
    private readonly token: string,
  ) {}

  static async as(request: APIRequestContext, user: DemoUser): Promise<Api> {
    const response = await request.post('/api/auth/login/', { data: { phone: user.phone, password: PASSWORD } })
    expect(response.ok()).toBeTruthy()
    return new Api(request, (await response.json()).token)
  }

  private async call<T>(method: 'get' | 'post' | 'patch', path: string, data?: unknown): Promise<T> {
    const response = await this.request[method](`/api${path}`, {
      headers: { Authorization: `Token ${this.token}` },
      data,
    })
    expect(response.ok(), `${method.toUpperCase()} ${path}: ${await response.text()}`).toBeTruthy()
    return (await response.json()) as T
  }

  registerPatient(input: { full_name: string; phone?: string; doctor_ids?: number[] }) {
    return this.call<{ id: number; full_name: string }>('post', '/patients/', { phone: uniquePhone(), ...input })
  }

  doctors() {
    return this.call<{ id: number; full_name: string }[]>('get', '/doctors/')
  }

  book(patientId: number, doctorId?: number, scheduledAt = new Date(Date.now() + 30 * 60_000).toISOString()) {
    return this.call<{ id: number }>('post', '/appointments/', {
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_at: scheduledAt,
    })
  }

  checkIn(appointmentId: number) {
    return this.call<{ id: number }>('post', `/appointments/${appointmentId}/check-in/`)
  }

  startVisit(appointmentId: number) {
    return this.call<{ id: number; visit_id: number }>('post', `/appointments/${appointmentId}/start-visit/`)
  }

  recordVisit(visitId: number, data: { notes?: string; diagnosis?: string; treatment?: string }) {
    return this.call<{ id: number }>('patch', `/visits/${visitId}/`, data)
  }

  completeVisit(visitId: number) {
    return this.call<{ id: number }>('post', `/visits/${visitId}/complete/`)
  }
}

/** Patient of Dr. Amal, checked in and waiting (created by Rana). */
export async function waitingPatientOfAmal(request: APIRequestContext, name = uniqueName()) {
  const rana = await Api.as(request, USERS.rana)
  const amal = (await rana.doctors()).find((d) => d.full_name === USERS.amal.name)!
  const patient = await rana.registerPatient({ full_name: name, doctor_ids: [amal.id] })
  const appointment = await rana.book(patient.id, amal.id)
  await rana.checkIn(appointment.id)
  return { rana, amalId: amal.id, patient, appointment }
}
