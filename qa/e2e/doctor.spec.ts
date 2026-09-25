import { expect, test } from '@playwright/test'
import { Api, loginAs, statusBadge, uniqueName, USERS, waitingPatientOfAmal } from './support'

// VISIT-001..008, MED-002, DX-001, APPT-003, APPT-006, LIFE-003
test.describe('Doctor visit', () => {
  test('doctor starts a visit from the queue, records the session and completes it', async ({ page, request }) => {
    const name = uniqueName('Visit')
    await waitingPatientOfAmal(request, name)

    await loginAs(page, USERS.amal)
    const queue = page.getByRole('list', { name: 'My queue' })
    const row = queue.getByRole('listitem').filter({ hasText: name })
    await row.getByRole('button', { name: 'Start visit' }).click()
    await expect(page).toHaveURL(/\/visits\/\d+$/)
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(statusBadge(page)).toHaveText('Active')

    await page.getByLabel('Visit notes').fill('Pain on cold drinks, lower left.')
    await page.getByLabel('Diagnosis').fill('Reversible pulpitis #36')
    await page.getByLabel('Treatment').fill('Composite restoration')
    await page.getByRole('button', { name: 'Save notes' }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()

    await page.getByLabel('Procedure', { exact: true }).selectOption({ label: 'Composite filling (D2391)' })
    await page.getByLabel('Tooth').fill('36')
    await page.getByRole('button', { name: 'Add procedure' }).click()
    const procedures = page.getByRole('list', { name: 'Recorded procedures' })
    await expect(procedures).toContainText('Composite filling')
    await expect(procedures).toContainText('Tooth 36')

    await page.getByLabel(/^Medication/).selectOption({ label: 'Amoxicillin — 500 mg capsule' })
    await page.getByLabel(/^Quantity/).fill('21 capsules')
    await page.getByLabel(/^Duration/).fill('7 days')
    await page.getByRole('button', { name: 'Add medication' }).click()
    await expect(page.getByRole('list', { name: 'Prescribed medications' })).toContainText('21 capsules, 7 days')

    await page.getByLabel('Follow-up notes').fill('Check the filling')
    await page.getByRole('button', { name: 'Book follow-up' }).click()
    await expect(page.getByRole('list', { name: 'Follow-up visits' })).toContainText('Scheduled')

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Complete visit' }).click()
    await expect(statusBadge(page)).toHaveText('Completed')
    await expect(page.getByText(/completed and kept in the patient's history/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Complete visit' })).toHaveCount(0)

    // VISIT-008 / LIFE-003: completed visit stays in the patient's history.
    await page.getByRole('link', { name: 'Patient history' }).click()
    const history = page.getByRole('list', { name: 'Visit history' })
    await expect(history).toContainText('Reversible pulpitis #36')
    await expect(history).toContainText('Composite filling')
    await expect(history).toContainText('Amoxicillin')
    await expect(history).toContainText('Completed')
    await expect(page.getByRole('list', { name: 'Patient appointments' })).toContainText('Scheduled')
  })

  test('visit cannot be completed before the outcome is recorded', async ({ page, request }) => {
    const { rana, appointment } = await waitingPatientOfAmal(request)
    const started = await rana.startVisit(appointment.id)
    await loginAs(page, USERS.amal)
    await page.goto(`/visits/${started.visit_id}`)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Complete visit' }).click()
    await expect(page.getByRole('alert')).toContainText('Record the session outcome')
    await expect(statusBadge(page)).toHaveText('Active')
  })

  test('invalid tooth numbers are rejected', async ({ page, request }) => {
    const { rana, appointment } = await waitingPatientOfAmal(request)
    const started = await rana.startVisit(appointment.id)
    await loginAs(page, USERS.amal)
    await page.goto(`/visits/${started.visit_id}`)
    await page.getByLabel('Procedure notes').fill('Check')
    await page.getByLabel('Tooth').fill('99')
    await page.getByRole('button', { name: 'Add procedure' }).click()
    await expect(page.getByText(/Use FDI tooth notation/)).toBeVisible()
  })

  test('new patient shows an empty history', async ({ page, request }) => {
    const rana = await Api.as(request, USERS.rana)
    const amal = (await rana.doctors()).find((d) => d.full_name === USERS.amal.name)!
    const patient = await rana.registerPatient({ full_name: uniqueName('Fresh'), doctor_ids: [amal.id] })
    await loginAs(page, USERS.amal)
    await page.goto(`/patients/${patient.id}`)
    await expect(page.getByText('No previous visits. This patient has no history yet.')).toBeVisible()
  })

  test("another doctor cannot see or edit Dr. Amal's patient", async ({ page, request }) => {
    const name = uniqueName('Private')
    const { rana, patient, appointment } = await waitingPatientOfAmal(request, name)
    const started = await rana.startVisit(appointment.id)
    await loginAs(page, USERS.omar)
    await page.goto('/patients')
    await page.getByLabel('Search patients').fill(name)
    await expect(page.getByText('No patients match your search.')).toBeVisible()
    await page.goto(`/patients/${patient.id}`)
    await expect(page.getByRole('alert')).toHaveText('Not found.')
    await page.goto(`/visits/${started.visit_id}`)
    await expect(page.getByRole('alert')).toHaveText('Not found.')
  })
})
