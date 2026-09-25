// Renders the SVG icons to the PNG sizes the web app manifest needs.
// Usage: NODE_PATH=$(npm root -g) node scripts/generate-icons.cjs
// (needs Playwright with Chromium; the PNGs are committed, so this only
// has to run when the SVGs change).
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const pub = path.join(__dirname, '..', 'public')
const targets = [
  ['favicon.svg', 'pwa-192x192.png', 192],
  ['favicon.svg', 'pwa-512x512.png', 512],
  ['maskable.svg', 'maskable-512x512.png', 512],
  ['maskable.svg', 'apple-touch-icon.png', 180],
]

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const [source, output, size] of targets) {
    const svg = fs.readFileSync(path.join(pub, source), 'utf8')
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(
      `<html><body style="margin:0;background:transparent">` +
        svg.replace('<svg ', `<svg width="${size}" height="${size}" `) +
        `</body></html>`,
    )
    await page.locator('svg').screenshot({ path: path.join(pub, output), omitBackground: true })
    console.log(`public/${output}`)
  }
  await browser.close()
})()
