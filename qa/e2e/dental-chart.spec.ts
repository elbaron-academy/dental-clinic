import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { loginAs, logout, statusBadge, USERS, waitingPatientOfAmal } from './support'

// CHART-001..004 (CR-023): dental chart on the doctor visit page.

const tooth = (page: Page, number: string) => page.getByRole('button', { name: new RegExp(`^Tooth ${number}:`) })
const picker = (page: Page, number: string) => page.getByRole('group', { name: `Actions for tooth ${number}` })

/** Checked-in patient of Dr. Amal whose visit has been started; returns the visit id. */
async function startedVisit(request: APIRequestContext) {
  const { rana, patient, appointment } = await waitingPatientOfAmal(request)
  const { visit_id } = await rana.startVisit(appointment.id)
  return { rana, patient, visitId: visit_id }
}

test.describe('Dental chart', () => {
  test('doctor marks, colors and removes tooth actions', async ({ page, request }) => {
    const { visitId } = await startedVisit(request)
    await loginAs(page, USERS.amal)
    await page.goto(`/visits/${visitId}`)

    const chart = page.locator('.dental-chart')
    await expect(chart.getByRole('group', { name: 'Upper teeth' }).getByRole('button')).toHaveCount(16)
    await expect(chart.getByRole('group', { name: 'Lower teeth' }).getByRole('button')).toHaveCount(16)
    const legend = page.getByRole('list', { name: 'Chart legend' })
    for (const name of ['Caries', 'Filling', 'Root canal', 'Crown', 'Extraction', 'Implant']) {
      await expect(legend).toContainText(name)
    }

    await tooth(page, '36').click()
    await expect(tooth(page, '36')).toHaveAttribute('aria-pressed', 'true')
    await picker(page, '36').getByLabel('Action notes').fill('MO')
    await picker(page, '36').getByRole('button', { name: 'Filling' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 36: Filling' })).toBeVisible()
    // Filling is blue (#2563EB) by default.
    await expect(tooth(page, '36')).toHaveCSS('background-color', 'rgb(37, 99, 235)')
    await expect(picker(page, '36').getByRole('button', { name: 'Filling' })).toHaveAttribute('aria-pressed', 'true')

    await picker(page, '36').getByRole('button', { name: 'Caries' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 36: Filling, Caries' })).toBeVisible()
    await expect(tooth(page, '36')).toHaveCSS('background-image', /linear-gradient/)

    const list = page.getByRole('list', { name: 'Tooth actions' })
    await expect(list).toContainText('Tooth 36')
    await expect(list).toContainText('Filling')
    await expect(list).toContainText('MO')

    // Unmark from the picker, then from the list.
    await picker(page, '36').getByRole('button', { name: 'Caries' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 36: Filling' })).toBeVisible()
    await page.getByRole('button', { name: 'Remove Filling from tooth 36' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 36: no actions' })).toBeVisible()
    await expect(list).toHaveCount(0)

    // Primary teeth.
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: /Primary teeth/ }).click()
    await expect(chart.getByRole('group', { name: 'Upper teeth' }).getByRole('button')).toHaveCount(10)
    await tooth(page, '55').click()
    await picker(page, '55').getByRole('button', { name: 'Extraction' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 55: Extraction' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Primary teeth/ })).toContainText('1')
  })

  test('a charted tooth completes the visit and the chart stays in history, read-only', async ({ page, request }) => {
    const { visitId, patient } = await startedVisit(request)
    await loginAs(page, USERS.amal)
    await page.goto(`/visits/${visitId}`)
    await tooth(page, '11').click()
    await picker(page, '11').getByRole('button', { name: 'Crown' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 11: Crown' })).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Complete visit' }).click()
    await expect(statusBadge(page)).toHaveText('Completed')
    await expect(page.getByRole('img', { name: 'Tooth 11: Crown' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Tooth / })).toHaveCount(0)

    await page.goto(`/patients/${patient.id}`)
    await expect(page.getByRole('list', { name: 'Visit history' })).toContainText('Crown')
    await expect(page.getByRole('list', { name: 'Visit history' })).toContainText('Tooth 11')
  })

  test('each visit starts with an empty chart (visit isolation)', async ({ page, request }) => {
    const { rana, patient, visitId } = await startedVisit(request)
    await loginAs(page, USERS.amal)
    await page.goto(`/visits/${visitId}`)
    await tooth(page, '46').click()
    await picker(page, '46').getByRole('button', { name: 'Root canal' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 46: Root canal' })).toBeVisible()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Complete visit' }).click()
    await expect(statusBadge(page)).toHaveText('Completed')

    const amal = (await rana.doctors()).find((d) => d.full_name === USERS.amal.name)!
    const next = await rana.book(patient.id, amal.id)
    await rana.checkIn(next.id)
    const second = await rana.startVisit(next.id)
    await page.goto(`/visits/${second.visit_id}`)
    await expect(statusBadge(page)).toHaveText('Active')
    await expect(page.getByRole('button', { name: 'Tooth 46: no actions' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Tooth actions' })).toHaveCount(0)

    await page.goto(`/visits/${visitId}`)
    await expect(page.getByRole('img', { name: 'Tooth 46: Root canal' })).toBeVisible()
  })

  test('assistant sees the chart read-only; another doctor cannot open it', async ({ page, request }) => {
    const { visitId } = await startedVisit(request)
    await loginAs(page, USERS.amal)
    await page.goto(`/visits/${visitId}`)
    await tooth(page, '21').click()
    await picker(page, '21').getByRole('button', { name: 'Caries' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 21: Caries' })).toBeVisible()
    await logout(page)

    await loginAs(page, USERS.sara)
    await page.goto(`/visits/${visitId}`)
    await expect(page.getByRole('img', { name: 'Tooth 21: Caries' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Tooth / })).toHaveCount(0)
    await expect(page.getByRole('group', { name: /Actions for tooth/ })).toHaveCount(0)
    await logout(page)

    await loginAs(page, USERS.omar)
    await page.goto(`/visits/${visitId}`)
    await expect(page.getByRole('alert')).toHaveText('Not found.')
  })

  test('chart works on a phone without horizontal scrolling @mobile', async ({ page, request }) => {
    const { visitId } = await startedVisit(request)
    await loginAs(page, USERS.amal)
    await page.goto(`/visits/${visitId}`)
    await tooth(page, '18').click()
    await picker(page, '18').getByRole('button', { name: 'Implant' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 18: Implant' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('doctor adds a new action from the chart; it is marked and offered next time', async ({ page, request }) => {
    const { visitId } = await startedVisit(request)
    const name = `Veneer ${Date.now().toString(36)}`
    await loginAs(page, USERS.amal)
    await page.goto(`/visits/${visitId}`)
    await tooth(page, '12').click()
    await picker(page, '12').getByRole('button', { name: '+ New action' }).click()
    const form = page.getByRole('form', { name: 'New action' })
    await form.getByLabel(/New action name/).fill(name)
    await form.getByLabel('Color').fill('#db2777')
    await form.getByRole('button', { name: 'Add to tooth 12' }).click()
    await expect(page.getByRole('button', { name: `Tooth 12: ${name}` })).toBeVisible()
    await expect(tooth(page, '12')).toHaveCSS('background-color', 'rgb(219, 39, 119)')
    await expect(page.getByRole('list', { name: 'Chart legend' })).toContainText(name)

    // Offered on other teeth and after a reload; duplicates are refused.
    await page.reload()
    await tooth(page, '13').click()
    await expect(picker(page, '13').getByRole('button', { name })).toBeVisible()
    await picker(page, '13').getByRole('button', { name: '+ New action' }).click()
    await page.getByLabel(/New action name/).fill(name.toLowerCase())
    await page.getByRole('button', { name: 'Add to tooth 13' }).click()
    await expect(picker(page, '13').getByRole('alert')).toContainText('already exists')
  })

  test('patient page shows the dental chart of the charted visits', async ({ page, request }) => {
    const { visitId, patient } = await startedVisit(request)
    await loginAs(page, USERS.amal)
    await page.goto(`/patients/${patient.id}`)
    await expect(page.getByText(/No teeth charted yet/)).toBeVisible()

    await page.goto(`/visits/${visitId}`)
    await tooth(page, '31').click()
    await picker(page, '31').getByRole('button', { name: 'Caries' }).click()
    await expect(page.getByRole('button', { name: 'Tooth 31: Caries' })).toBeVisible()

    await page.getByRole('link', { name: 'Patient history' }).click()
    const card = page.locator('section.card', { has: page.getByRole('heading', { name: 'Dental chart', level: 2 }) })
    await expect(card.getByRole('img', { name: 'Tooth 31: Caries' })).toBeVisible()
    await card.getByRole('link', { name: 'Continue visit' }).click()
    await expect(page).toHaveURL(new RegExp(`/visits/${visitId}$`))
  })

  test('the app version is shown in the top bar', async ({ page }) => {
    await loginAs(page, USERS.amal)
    await expect(page.getByTestId('topbar-version')).toHaveText(/^v\d+\.\d+\.\d+$/)
  })
})

