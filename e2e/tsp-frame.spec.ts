import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { freshDevice, shot } from './helpers'

freshDevice()

/**
 * Stands in for tsp-boards: shows its address, starts a module worker and has a full-screen button,
 * the two things that must work inside the frame.
 */
const STUB_PAGE = `<!doctype html><meta charset="utf-8"><title>tsp-boards stub</title>
<body style="font: 24px sans-serif">
<p id="hash"></p><p id="worker">no worker</p><button id="fullscreen">Vollbild</button>
<script type="module">
document.getElementById('hash').textContent = location.hash
const worker = new Worker(new URL('stub-worker.js', import.meta.url), { type: 'module' })
worker.onmessage = (e) => (document.getElementById('worker').textContent = 'worker ' + e.data)
worker.postMessage(6)
document.getElementById('fullscreen').onclick = () => document.documentElement.requestFullscreen()
</script>`
const STUB_WORKER = 'self.onmessage = (e) => self.postMessage(e.data * 7)'

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain',
}

/**
 * Serves tsp-boards at the address the build links to: the real build from `TSP_BOARDS_DIST` (the
 * `dist` folder of a tsp-boards checkout) if given, else the stub above.
 */
async function serveTspBoards(context: BrowserContext, base: URL) {
  const dist = process.env.TSP_BOARDS_DIST
  await context.route(
    (url) => url.href.startsWith(base.href),
    async (route) => {
      const path = new URL(route.request().url()).pathname.slice(base.pathname.length) || 'index.html'
      if (!dist) {
        if (path === 'stub-worker.js')
          return route.fulfill({ contentType: 'text/javascript', body: STUB_WORKER })
        return route.fulfill({ contentType: 'text/html', body: STUB_PAGE })
      }
      const file = join(dist, normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, ''))
      try {
        const body = await readFile(file)
        return route.fulfill({ body, contentType: TYPES[extname(file)] ?? 'application/octet-stream' })
      } catch {
        return route.fulfill({ status: 404, body: 'not found' })
      }
    },
  )
}

/** The address of tsp-boards in this build, read off the start map outside kiosk mode (null: hidden). */
async function tspBoardsAddress(page: Page): Promise<URL | null> {
  await page.goto('./')
  const link = page.getByRole('link', { name: /Rundreise/ })
  await expect(page.getByRole('heading', { name: 'Ruler of the Plane' })).toBeVisible()
  if (!(await link.count())) return null
  await expect(link).toHaveAttribute('target', '_blank')
  return new URL((await link.getAttribute('href'))!, page.url())
}

test('kiosk mode opens Rundreise in a frame that keeps the kiosk timeout', async ({
  page,
  context,
}, testInfo) => {
  const address = await tspBoardsAddress(page)
  test.skip(!address, 'build without VITE_TSP_BOARDS_URL: Rundreise is hidden')
  await serveTspBoards(context, address!)

  await page.clock.install()
  await page.goto('./?kiosk')
  const attract = page.getByRole('dialog', { name: 'Ruler of the Plane' })
  await attract.click()
  await expect(attract).toHaveCount(0)
  await page.getByRole('link', { name: /Rundreise/ }).click()
  await expect(page).toHaveURL(/#\/tsp$/)
  await expect(page.getByRole('heading', { name: 'Rundreise' })).toBeVisible()
  const frameElement = page.locator('iframe')
  await expect(frameElement).toHaveAttribute('src', /#kiosk$/)
  const frame = page.frameLocator('iframe')
  const real = !!process.env.TSP_BOARDS_DIST

  // The frame's workers run, and its full-screen button takes the frame to full screen.
  if (real) {
    await expect(frame.getByRole('button', { name: 'Vollbild' })).toBeVisible({ timeout: 20_000 })
  } else {
    await expect(frame.locator('#hash')).toHaveText('#kiosk')
    await expect(frame.locator('#worker')).toHaveText('worker 42')
  }
  await shot(page, testInfo, 'tsp-frame')
  await frame.getByRole('button', { name: 'Vollbild' }).click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName ?? null)).toBe('IFRAME')
  await page.evaluate(() => document.exitFullscreen())
  if (real) {
    // Open the first puzzle: tsp-boards computes the optimum in a worker.
    const workers: string[] = []
    page.on('worker', (w) => workers.push(w.url()))
    await frame.locator('.kiosk-card').first().click()
    await expect.poll(() => workers.length, { timeout: 20_000 }).toBeGreaterThan(0)
    await shot(page, testInfo, 'tsp-frame-play')
  }

  // Input inside the frame keeps the kiosk timeout from firing; without input it fires after 90 s.
  const box = (await frameElement.boundingBox())!
  for (let i = 0; i < 4; i++) {
    await page.clock.fastForward('00:40')
    await page.mouse.move(box.x + 20 + i * 15, box.y + box.height - 20, { steps: 3 })
  }
  await expect(attract).toHaveCount(0)
  await expect(page).toHaveURL(/#\/tsp$/)
  await page.clock.fastForward('01:35')
  await expect(attract).toBeVisible()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.locator('iframe')).toHaveCount(0)
})
