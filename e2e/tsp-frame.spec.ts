import { expect, test } from './fixtures'
import { freshDevice, shot } from './helpers'
import { serveTspBoards, tspBoardsAddress } from './tsp-boards'

freshDevice()

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
