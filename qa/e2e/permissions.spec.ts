import { expect, test } from '@playwright/test'
import { Api, loginAs, uniqueName, USERS, waitingPatientOfAmal } from './support'

// ROLE-001..004, AUTH-002: role and permissions shape the UI and access.
test.describe('Permissions', () => {
  test('assistant has read-only access to assigned doctor patients and history', async ({ page, request }) => {
    const name = uniqueName('Assisted')
    const { rana, appointment, patient } = await waitingPatientOfAmal(request, name)
    const started = await rana.startVisit(appointment.id)
    const amal = await Api.as(request, USERS.amal)
    await amal.recordVisit(started.visit_id, { diagnosis: 'Gingivitis' })
    await amal.completeVisit(started.visit_id)

    await loginAs(page, USERS.sara)
    await expect(page.getByRole('heading', { name: 'Clinic overview' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Register patient' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'New appointment' })).toHaveCount(0)

    await page.goto('/patients')
    await page.getByLabel('Search patients').fill(name)
    await page.getByRole('link', { name }).click()
    await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)
    const history = page.getByRole('list', { name: 'Visit history' })
    await expect(history).toContainText('Gingivitis')
    await expect(page.getByTestId('patient-balance')).toHaveCount(0)

    await page.goto(`/visits/${started.visit_id}`)
    await expect(page.getByText('Gingivitis')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Complete visit' })).toHaveCount(0)

    await page.goto('/patients/new')
    await expect(page.getByRole('heading', { name: 'Not available' })).toBeVisible()
    await page.goto(`/patients/${patient.id}/edit`)
    await expect(page.getByRole('heading', { name: 'Not available' })).toBeVisible()
  })

  test("assistant does not see patients of doctors they don't assist", async ({ page, request }) => {
    const rana = await Api.as(request, USERS.rana)
    const omar = (await rana.doctors()).find((d) => d.full_name === USERS.omar.name)!
    const name = uniqueName('OmarOnly')
    await rana.registerPatient({ full_name: name, doctor_ids: [omar.id] })
    await loginAs(page, USERS.sara)
    await page.goto('/patients')
    await page.getByLabel('Search patients').fill(name)
    await expect(page.getByText('No patients match your search.')).toBeVisible()
  })

  test('receptionist manages the queue but cannot open clinical records', async ({ page, request }) => {
    const { rana, appointment } = await waitingPatientOfAmal(request)
    const started = await rana.startVisit(appointment.id)
    await loginAs(page, USERS.rana)
    await page.goto(`/appointments/${appointment.id}`)
    await expect(page.locator('.page-header .badge')).toHaveText('In visit')
    await expect(page.getByRole('link', { name: /visit/i })).toHaveCount(0)
    await page.goto(`/visits/${started.visit_id}`)
    await expect(page.getByRole('heading', { name: 'Not available' })).toBeVisible()
  })

  test('doctor can register patients but has no other reception or payment tools', async ({ page, request }) => {
    const { appointment } = await waitingPatientOfAmal(request)
    await loginAs(page, USERS.amal)
    // CR-021: doctors register patients; appointments stay with reception.
    await expect(page.getByRole('link', { name: 'Register patient' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New appointment' })).toHaveCount(0)
    await page.goto(`/appointments/${appointment.id}`)
    await expect(page.getByRole('button', { name: 'Check in' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cancel appointment' })).toHaveCount(0)
    await expect(page.getByTestId('billing-summary')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Start visit' })).toBeVisible()
  })

  test('clinics are isolated from each other', async ({ page, request }) => {
    const name = uniqueName('SmileOnly')
    const { patient } = await waitingPatientOfAmal(request, name)
    await loginAs(page, USERS.mai)
    await page.goto('/patients')
    await page.getByLabel('Search patients').fill(name)
    await expect(page.getByText('No patients match your search.')).toBeVisible()
    await page.goto(`/patients/${patient.id}`)
    await expect(page.getByRole('alert')).toHaveText('Not found.')
  })
})
