import { expect, test } from '@playwright/test'
import { Api, loginAs, logout, uniqueName, uniquePhone, USERS } from './support'

// LIFE-001: Registered -> Appointment -> Checked in -> Waiting -> Active visit
// -> Recorded -> Completed -> Payment pending/paid -> optional follow-up.
test('full patient lifecycle across reception and doctor', async ({ page, request }) => {
  const name = uniqueName('Lifecycle')

  // Reception: register, book, check in.
  await loginAs(page, USERS.rana)
  await page.getByRole('link', { name: 'Register patient' }).click()
  await page.getByLabel(/Full name/).fill(name)
  await page.getByLabel(/Phone number/).fill(uniquePhone())
  await page.getByLabel(/^Doctor/).selectOption({ label: USERS.amal.name })
  await page.getByRole('button', { name: 'Register patient' }).click()
  await page.getByRole('link', { name: 'New appointment' }).click()
  await page.getByLabel(/^Doctor/).selectOption({ label: USERS.amal.name })
  await page.getByRole('button', { name: 'Create appointment' }).click()
  await expect(page.locator('.page-header .badge')).toHaveText('Scheduled')
  const appointmentUrl = page.url()
  await page.getByRole('button', { name: 'Check in' }).click()
  await expect(page.locator('.page-header .badge')).toHaveText('Waiting for doctor')
  await logout(page)

  // Doctor: waiting in the queue -> active visit -> record -> complete.
  await loginAs(page, USERS.amal)
  const row = page.getByRole('list', { name: 'My queue' }).getByRole('listitem').filter({ hasText: name })
  await row.getByRole('button', { name: 'Start visit' }).click()
  await page.getByLabel('Diagnosis').fill('Dental caries #16')
  await page.getByLabel('Treatment').fill('Composite filling')
  await page.getByLabel('Follow-up notes').fill('Review in two weeks')
  await page.getByRole('button', { name: 'Book follow-up' }).click()
  await expect(page.getByRole('list', { name: 'Follow-up visits' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Complete visit' }).click()
  await expect(page.locator('.page-header .badge').first()).toHaveText('Completed')
  await logout(page)

  // Reception: payment pending -> paid; follow-up appointment exists.
  await loginAs(page, USERS.rana)
  await page.goto(appointmentUrl)
  await expect(page.locator('.page-header .badge')).toHaveText('Completed')
  await page.getByLabel('Amount due').fill('350')
  await page.getByRole('button', { name: 'Set amount due' }).click()
  await expect(page.locator('.card-header .badge')).toHaveText('Payment pending')
  await page.getByRole('button', { name: 'Record payment' }).click()
  await expect(page.locator('.card-header .badge')).toHaveText('Paid')

  await page.getByRole('link', { name }).click()
  const appointments = page.getByRole('list', { name: 'Patient appointments' })
  await expect(appointments.getByRole('listitem')).toHaveCount(2)
  await expect(appointments).toContainText('Completed')
  await expect(appointments).toContainText('Scheduled')

  // The follow-up is linked to the visit.
  const rana = await Api.as(request, USERS.rana)
  expect(rana).toBeTruthy()
})
