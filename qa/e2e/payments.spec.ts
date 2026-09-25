import { expect, test } from '@playwright/test'
import { Api, loginAs, USERS, waitingPatientOfAmal } from './support'

// PAY-001..007
test.describe('Payments', () => {
  test('amount due, partial payment, overpayment guard and full payment', async ({ page, request }) => {
    const { appointment, patient } = await waitingPatientOfAmal(request)
    await loginAs(page, USERS.rana)
    await page.goto(`/appointments/${appointment.id}`)
    const summary = page.getByTestId('billing-summary')
    await expect(summary).toContainText('Not set')
    await expect(page.getByText('Amount due not set')).toBeVisible()

    await page.getByLabel('Amount due').fill('400')
    await page.getByRole('button', { name: 'Set amount due' }).click()
    await expect(summary).toContainText('400.00')
    await expect(page.getByText('Payment pending')).toBeVisible()

    // Payment before the visit (PAY-004).
    await page.getByLabel('Payment amount').fill('150')
    await expect(page.getByLabel('Method')).toHaveValue(/\d+/)
    await expect(page.getByLabel('Method').locator('option:checked')).toHaveText('Cash')
    await page.getByLabel('Note').fill('Deposit')
    await page.getByRole('button', { name: 'Record payment' }).click()
    await expect(summary).toContainText('250.00')
    const received = page.getByRole('list', { name: 'Payments received' })
    await expect(received).toContainText('150.00 · Cash')
    await expect(received).toContainText('Deposit')

    await page.getByLabel('Payment amount').fill('300')
    await page.getByRole('button', { name: 'Record payment' }).click()
    await expect(page.getByText('Payment exceeds the remaining amount (250.00).')).toBeVisible()

    await page.getByLabel('Payment amount').fill('250')
    await page.getByRole('button', { name: 'Record payment' }).click()
    await expect(page.locator('.card-header .badge')).toHaveText('Paid')
    await expect(page.getByRole('button', { name: 'Record payment' })).toHaveCount(0)

    await page.goto(`/patients/${patient.id}`)
    const balance = page.getByTestId('patient-balance')
    await expect(balance).toContainText('400.00')
    await expect(balance).toContainText('0.00')
  })

  test('payment after the visit is completed', async ({ page, request }) => {
    const { rana, appointment } = await waitingPatientOfAmal(request)
    const started = await rana.startVisit(appointment.id)
    // The doctor records and completes through the API; this test is about reception.
    const amal = await Api.as(request, USERS.amal)
    await amal.recordVisit(started.visit_id, { treatment: 'Scaling' })
    await amal.completeVisit(started.visit_id)

    await loginAs(page, USERS.rana)
    await page.goto(`/appointments/${appointment.id}`)
    await expect(page.locator('.page-header .badge')).toHaveText('Completed')
    await page.getByLabel('Amount due').fill('200')
    await page.getByRole('button', { name: 'Set amount due' }).click()
    await page.getByLabel('Payment amount').fill('200')
    await page.getByRole('button', { name: 'Record payment' }).click()
    await expect(page.locator('.card-header .badge')).toHaveText('Paid')
  })
})
