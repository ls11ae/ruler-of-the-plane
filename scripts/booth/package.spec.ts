import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { de } from '../../src/ui/i18n/de'

/**
 * The booth package as the booth laptop runs it (see playwright.config.ts here): the app in kiosk mode
 * from the local server, every game, "Rundreise" with the local tsp-boards in its frame, the credits;
 * nothing may come from another host, no request may fail, no page error.
 */

const GAMES = ['art-gallery', 'voronoi', 'frechet', 'lawn-mowing', 'roads'] as const

interface Watch {
  external: string[]
  failed: string[]
  errors: string[]
}

async function watch(context: BrowserContext, page: Page): Promise<Watch> {
  const w: Watch = { external: [], failed: [], errors: [] }
  await context.route(
    (url) => url.host !== 'localhost:8137',
    (route) => {
      w.external.push(route.request().url())
      return route.abort()
    },
  )
  context.on('response', (res) => {
    if (res.status() >= 400) w.failed.push(`${res.status()} ${res.url()}`)
  })
  page.on('pageerror', (e) => w.errors.push(e.message))
  return w
}

async function openEveryGame(page: Page) {
  for (const id of GAMES) {
    await page.getByRole('link', { name: new RegExp(de.places[id].name) }).click()
    const howTo = page.getByRole('dialog', { name: de.game.howTo })
    await expect(howTo).toBeVisible({ timeout: 15_000 })
    await howTo.getByRole('button', { name: de.game.letsGo }).click()
    const setup = page.getByRole('dialog', { name: 'Neues Spiel' })
    if (await setup.count()) await setup.getByRole('button', { name: de.game.letsGo }).click()
    await expect(page.locator('header h1')).toBeVisible()
    await page.getByRole('link', { name: de.game.backLabel }).click()
    await expect(page.getByRole('heading', { name: de.start.title })).toBeVisible()
  }
}

test('the booth runs from the local server alone: every game, Rundreise, credits', async ({
  page,
  context,
}) => {
  const w = await watch(context, page)
  await page.goto('/?kiosk')
  await expect(page).toHaveURL(/\/ruler-of-the-plane\/\?kiosk/)
  const attract = page.getByRole('dialog', { name: de.start.title })
  await expect(attract).toBeVisible()
  await attract.click()
  await expect(attract).toHaveCount(0)

  await openEveryGame(page)

  // Rundreise: tsp-boards from /tsp-boards/ in its frame, with a puzzle (a worker computes the optimum).
  const workers: string[] = []
  page.on('worker', (worker) => workers.push(worker.url()))
  await page.getByRole('link', { name: new RegExp(de.places.tsp.name) }).click()
  await expect(page).toHaveURL(/#\/tsp$/)
  await expect(page.locator('iframe')).toHaveAttribute('src', '/tsp-boards/#kiosk')
  const frame = page.frameLocator('iframe')
  await expect(frame.getByRole('button', { name: 'Vollbild' })).toBeVisible({ timeout: 20_000 })
  await frame.locator('.kiosk-card').first().click()
  await expect
    .poll(() => workers.filter((u) => u.includes('/tsp-boards/')).length, { timeout: 20_000 })
    .toBeGreaterThan(0)
  await page.getByRole('link', { name: de.game.backLabel }).click()

  // Credits with every licence text (credits.txt).
  await page.getByRole('link', { name: de.credits.open }).click()
  await page.getByRole('button', { name: de.credits.full }).click()
  await expect(page.locator('pre')).toContainText('SIL OPEN FONT LICENSE')

  expect(w.external, 'requests to other hosts').toEqual([])
  expect(w.failed, 'failed requests').toEqual([])
  expect(w.errors, 'page errors').toEqual([])
})

test('the app keeps running from its offline copy if the server goes away', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'emulated offline with a service worker is checked in Chromium')
  const w = await watch(context, page)
  await page.goto('/ruler-of-the-plane/?kiosk')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve))
    }
  })
  // The precache installs in the background; wait until it holds the whole build.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const names = await caches.keys()
          let n = 0
          for (const name of names) n += (await (await caches.open(name)).keys()).length
          return n
        }),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(100)
  await context.setOffline(true)
  await page.reload()
  const attract = page.getByRole('dialog', { name: de.start.title })
  await attract.click()
  await openEveryGame(page)
  await context.setOffline(false)
  expect(w.external, 'requests to other hosts').toEqual([])
  expect(w.errors, 'page errors').toEqual([])
})
