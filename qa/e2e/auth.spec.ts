import { expect, test } from '@playwright/test'
import { loginAs, logout, PASSWORD, USERS } from './support'

// AUTH-001..003, AUTH-002 role-aware routing, S02-PWA-01..04
test.describe('Authentication and role-aware routing', () => {
  test('portal chooser lists the three role login pages', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    for (const label of ['Doctor', 'Assistant', 'Receptionist']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${label}`) })).toBeVisible()
    }
  })

  for (const user of [USERS.amal, USERS.sara, USERS.rana]) {
    test(`${user.role} signs in with phone + password on their own page`, async ({ page }) => {
      await loginAs(page, user)
      await expect(page.getByText(user.name, { exact: false }).first()).toBeVisible()
      await expect(page.locator('.badge-role')).toHaveText(
        { DOCTOR: 'Doctor', ASSISTANT: 'Assistant', RECEPTIONIST: 'Receptionist' }[user.role],
      )
    })
  }

  test('login form has phone and password only (no username)', async ({ page }) => {
    await page.goto('/login/doctor')
    await expect(page.getByLabel('Phone number')).toHaveAttribute('type', 'tel')
    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')
    await expect(page.getByLabel(/username/i)).toHaveCount(0)
  })

  test('wrong password shows an error', async ({ page }) => {
    await page.goto('/login/reception')
    await page.getByLabel('Phone number').fill(USERS.rana.phone)
    await page.getByLabel('Password').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('Invalid phone number or password.')
    await expect(page).toHaveURL(/\/login\/reception$/)
  })

  test('an account cannot sign in through another role portal', async ({ page }) => {
    await page.goto('/login/doctor')
    await page.getByLabel('Phone number').fill(USERS.rana.phone)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toContainText('Receptionist login page')
    await expect(page).toHaveURL(/\/login\/doctor$/)
  })

  test('formatted phone numbers are accepted', async ({ page }) => {
    await page.goto('/login/doctor')
    await page.getByLabel('Phone number').fill('0100 000-0001')
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/doctor')
  })

  test('protected pages require login', async ({ page }) => {
    await page.goto('/patients')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('each role stays on its own home', async ({ page }) => {
    await loginAs(page, USERS.amal)
    await page.goto('/reception')
    await expect(page).toHaveURL(/\/doctor$/)
    await expect(page.getByRole('heading', { name: 'My day' })).toBeVisible()
  })

  test('session survives reload and logout ends it', async ({ page }) => {
    await loginAs(page, USERS.rana)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Reception' })).toBeVisible()
    await logout(page)
    await expect(page).toHaveURL(/\/login\/reception$/)
    await page.goto('/reception')
    await expect(page).toHaveURL(/\/login$/)
  })
})
