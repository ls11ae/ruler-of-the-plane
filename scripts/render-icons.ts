/**
 * Renders the app icons in `public/icons/` from `public/favicon.svg` with Playwright's Chromium.
 * Run once after changing the favicon: `npx tsx scripts/render-icons.ts` (the PNGs are committed).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const root = join(import.meta.dirname, '..')
const svg = readFileSync(join(root, 'public', 'favicon.svg'), 'utf8')
const preinstalled = '/opt/pw-browsers/chromium'

const icons: { file: string; size: number; padding: number; background: string }[] = [
  { file: 'icon-192.png', size: 192, padding: 0, background: 'transparent' },
  { file: 'icon-512.png', size: 512, padding: 0, background: 'transparent' },
  // Maskable icons need the motif inside the central 80 % "safe zone".
  { file: 'icon-maskable-512.png', size: 512, padding: 0.14, background: '#ead6a8' },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.08, background: '#ead6a8' },
]

const browser = await chromium.launch(existsSync(preinstalled) ? { executablePath: preinstalled } : {})
const page = await browser.newPage()
for (const { file, size, padding, background } of icons) {
  await page.setViewportSize({ width: size, height: size })
  const inner = size * (1 - 2 * padding)
  await page.setContent(
    `<html><body style="margin:0;background:${background};display:grid;place-items:center;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>` +
      `</body></html>`,
  )
  await page.screenshot({
    path: join(root, 'public', 'icons', file),
    omitBackground: background === 'transparent',
  })
  console.log(`wrote public/icons/${file}`)
}
await browser.close()
