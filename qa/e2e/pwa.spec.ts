import { expect, test } from '@playwright/test'
import { loginAs, USERS } from './support'

// FND-003, S07-QA-03: installable PWA with an offline app shell.
test.describe('PWA', () => {
  test.use({ serviceWorkers: 'allow' })

  test('web app manifest is linked and complete', async ({ page, request }) => {
    await page.goto('/login')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()
    const response = await request.get(href!)
    expect(response.ok()).toBeTruthy()
    const manifest = await response.json()
    expect(manifest.name).toBe('Dental Clinic')
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.theme_color).toBe('#0f766e')
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBeTruthy()
    for (const icon of manifest.icons as { src: string }[]) {
      const image = await request.get(`/${icon.src}`)
      expect(image.ok()).toBeTruthy()
      expect(image.headers()['content-type']).toContain('image/png')
    }
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0f766e')
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png')
  })

  test('service worker installs and serves the app shell offline', async ({ page, context }) => {
    await page.goto('/login')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

    await context.setOffline(true)
    await page.goto('/login/doctor')
    await expect(page.getByRole('heading', { name: 'Doctor sign in' })).toBeVisible()
    await context.setOffline(false)
  })

  test('offline banner warns that changes cannot be saved', async ({ page, context }) => {
    await loginAs(page, USERS.rana)
    await context.setOffline(true)
    await expect(page.getByText('You are offline. Changes cannot be saved')).toBeVisible()
    await context.setOffline(false)
    await expect(page.getByText('You are offline.')).toHaveCount(0)
  })

  test('API responses are never served from the offline cache', async ({ page, context }) => {
    await loginAs(page, USERS.rana)
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await context.setOffline(true)
    const failed = await page.evaluate(async () => {
      try {
        await fetch('/api/health/')
        return false
      } catch {
        return true
      }
    })
    expect(failed).toBe(true)
    await context.setOffline(false)
  })
})

test.describe('Responsive layout @mobile', () => {
  test('login and dashboard fit a phone screen without horizontal scrolling @mobile', async ({ page }) => {
    await page.goto('/login')
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(await overflow()).toBeLessThanOrEqual(0)
    await loginAs(page, USERS.rana)
    await expect(page.getByRole('heading', { name: 'Reception' })).toBeVisible()
    expect(await overflow()).toBeLessThanOrEqual(0)
    await page.goto('/patients/new')
    expect(await overflow()).toBeLessThanOrEqual(0)
  })
})
