import { expect, test } from '@playwright/test'
import { Api, loginAs, statusBadge, uniqueName, uniquePhone, USERS, waitingPatientOfAmal } from './support'

// PATIENT-001..005, CLINIC-002/003, APPT-001..005, LIFE-002
test.describe('Reception workflow', () => {
  test('registers an adult patient with doctor selection (multi-doctor clinic)', async ({ page }) => {
    const name = uniqueName('Adult')
    await loginAs(page, USERS.rana)
    await page.getByRole('link', { name: 'Register patient' }).click()
    await page.getByLabel(/Full name/).fill(name)
    await page.getByLabel(/Phone number/).fill('0122 333 4444')
    await page.getByRole('button', { name: 'Register patient' }).click()
    await expect(page.getByText('Select a doctor.')).toBeVisible()

    await page.getByLabel(/^Doctor/).selectOption({ label: USERS.omar.name })
    await page.getByLabel(/Address/).fill('12 Nile St, Cairo')
    await page.getByRole('button', { name: 'Register patient' }).click()

    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByText('Patient saved.')).toBeVisible()
    await expect(page.getByText('01223334444')).toBeVisible()
    await expect(page.getByText('12 Nile St, Cairo')).toBeVisible()
    await expect(page.getByText(USERS.omar.name)).toBeVisible()
    await expect(page.getByText('No appointments yet.')).toBeVisible()
  })

  test('minor patients require guardian name and phone', async ({ page }) => {
    await loginAs(page, USERS.rana)
    await page.goto('/patients/new')
    await page.getByLabel(/Full name/).fill(uniqueName('Minor'))
    await page.getByLabel(/Phone number/).fill(uniquePhone())
    await page.getByLabel('Patient is a minor').check()
    await page.getByLabel(/^Doctor/).selectOption({ label: USERS.amal.name })
    await page.getByRole('button', { name: 'Register patient' }).click()
    await expect(page.getByText('Guardian name is required for a minor.')).toBeVisible()
    await expect(page.getByText('Guardian phone is required for a minor.')).toBeVisible()

    await page.getByLabel(/Guardian name/).fill('Parent Name')
    await page.getByLabel(/Guardian phone/).fill('0100 111 2222')
    await page.getByRole('button', { name: 'Register patient' }).click()
    await expect(page.getByText('Parent Name · 01001112222')).toBeVisible()
  })

  test('single-doctor clinic selects the doctor automatically', async ({ page }) => {
    const name = uniqueName('Solo')
    await loginAs(page, USERS.mai)
    await page.goto('/patients/new')
    await expect(page.getByTestId('auto-doctor')).toHaveText(`${USERS.youssef.name} (selected automatically)`)
    await page.getByLabel(/Full name/).fill(name)
    await page.getByLabel(/Phone number/).fill(uniquePhone())
    await page.getByRole('button', { name: 'Register patient' }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible()

    await page.getByRole('link', { name: 'New appointment' }).click()
    await expect(page.getByTestId('auto-doctor')).toBeVisible()
    await page.getByRole('button', { name: 'Create appointment' }).click()
    await expect(page.getByText(`· ${USERS.youssef.name}`)).toBeVisible()
  })

  test('searches patients by name and phone', async ({ page, request }) => {
    const rana = await Api.as(request, USERS.rana)
    const [amal] = await rana.doctors()
    const name = uniqueName('Searchable')
    const phone = uniquePhone()
    await rana.registerPatient({ full_name: name, phone, doctor_ids: [amal.id] })
    await loginAs(page, USERS.rana)
    await page.goto('/patients')
    await page.getByLabel('Search patients').fill(name)
    await expect(page.getByRole('link', { name })).toBeVisible()
    await page.getByLabel('Search patients').fill(phone.slice(0, 9))
    await expect(page.getByRole('link', { name })).toBeVisible()
    await page.getByLabel('Search patients').fill('zz-no-such-patient')
    await expect(page.getByText('No patients match your search.')).toBeVisible()
  })

  test('books, checks in and starts a visit from the dashboard', async ({ page, request }) => {
    const rana = await Api.as(request, USERS.rana)
    const amal = (await rana.doctors()).find((d) => d.full_name === USERS.amal.name)!
    const name = uniqueName('Queue')
    await rana.registerPatient({ full_name: name, doctor_ids: [amal.id] })

    await loginAs(page, USERS.rana)
    await page.getByRole('link', { name: 'New appointment' }).click()
    await page.getByRole('searchbox', { name: 'Patient' }).fill(name)
    await page.getByRole('option', { name: new RegExp(name) }).click()
    await page.getByLabel(/^Doctor/).selectOption({ label: USERS.amal.name })
    await page.getByLabel(/^Notes/).fill('Toothache')
    await page.getByRole('button', { name: 'Create appointment' }).click()
    await expect(statusBadge(page)).toHaveText('Scheduled')

    await page.getByRole('button', { name: 'Check in' }).click()
    await expect(statusBadge(page)).toHaveText('Waiting for doctor')

    await page.getByRole('link', { name: 'Home' }).click()
    const waiting = page.getByRole('list', { name: 'Waiting for doctor' })
    const row = waiting.getByRole('listitem').filter({ hasText: name })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Start visit' }).click()
    const inVisit = page.getByRole('list', { name: 'In visit' })
    await expect(inVisit.getByRole('listitem').filter({ hasText: name })).toBeVisible()
    await expect(waiting.getByRole('listitem').filter({ hasText: name })).toHaveCount(0)
  })

  test('refuses a second active visit for the same patient', async ({ page, request }) => {
    const { rana, amalId, patient, appointment } = await waitingPatientOfAmal(request)
    await rana.startVisit(appointment.id)
    const second = await rana.book(patient.id, amalId)
    await rana.checkIn(second.id)

    await loginAs(page, USERS.rana)
    await page.goto(`/appointments/${second.id}`)
    await page.getByRole('button', { name: 'Start visit' }).click()
    await expect(page.getByRole('alert')).toHaveText('This patient is already in an active visit.')
    await expect(statusBadge(page)).toHaveText('Waiting for doctor')
  })

  test('walk-in: create and check in at once, then cancel', async ({ page, request }) => {
    const rana = await Api.as(request, USERS.rana)
    const [amal] = await rana.doctors()
    const name = uniqueName('Walkin')
    const patient = await rana.registerPatient({ full_name: name, doctor_ids: [amal.id] })

    await loginAs(page, USERS.rana)
    await page.goto(`/appointments/new?patient=${patient.id}`)
    await expect(page.getByText(name)).toBeVisible()
    await page.getByLabel(/^Doctor/).selectOption({ index: 1 })
    await page.getByLabel(/walk-in/).check()
    await page.getByRole('button', { name: 'Create appointment' }).click()
    await expect(statusBadge(page)).toHaveText('Waiting for doctor')

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Cancel appointment' }).click()
    await expect(statusBadge(page)).toHaveText('Cancelled')
    await expect(page.getByRole('button', { name: 'Check in' })).toHaveCount(0)
  })
})
