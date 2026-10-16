import { expect, test } from '@playwright/test'
import { freshDevice, shot } from './helpers'

freshDevice()

test('start map shows every place and switches the language', async ({ page }, testInfo) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Ruler of the Plane' })).toBeVisible()
  for (const name of ['Licht ins Verlies', 'Erobere das Land', 'Gassi gehen', 'Rasenmähen', 'Straßenbau']) {
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: /Alte Ruinen/ })).toHaveAttribute(
    'href',
    'https://kbuchin.github.io/ruler/',
  )
  // VITE_TSP_BOARDS_URL is not set in CI: the "Rundreise" place is hidden.
  await expect(page.getByText('Rundreise')).toHaveCount(0)
  await shot(page, testInfo, 'start')

  await page.getByRole('button', { name: /Switch to English/ }).click()
  await expect(page.getByText('Light the Dungeon')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await shot(page, testInfo, 'start-en')
  await page.reload()
  await expect(page.getByText('Light the Dungeon')).toBeVisible()
})

test('demo page: board, tokens, how-to, result and leaderboard', async ({ page }, testInfo) => {
  await page.goto('./#/demo')
  const board = page.getByRole('img', { name: 'Werkstatt' })
  await expect(board).toBeVisible()
  // Tap twice into corridors of agLevel4_8 (inside the dungeon, outside the pillars), given in level
  // coordinates and mapped to the screen through the board's transformation.
  const toScreen = (x: number, y: number) =>
    board.evaluate(
      (svg, [x, y]) => {
        const p = new DOMPoint(x, y).matrixTransform((svg as SVGSVGElement).getScreenCTM()!)
        return { x: p.x, y: p.y }
      },
      [x, y],
    )
  for (const [x, y] of [
    [0, -2.5],
    [-3.2, 2.5],
  ] as const) {
    const p = await toScreen(x, y)
    await page.mouse.click(p.x, p.y)
  }
  await expect(page.getByText('Marken: 2')).toBeVisible()
  await shot(page, testInfo, 'demo')

  await page.getByRole('button', { name: "So geht's" }).click()
  await expect(page.getByRole('dialog', { name: "So geht's" })).toBeVisible()
  await shot(page, testInfo, 'demo-howto')
  await page.getByRole('button', { name: "Los geht's!" }).click()

  await page.getByRole('button', { name: 'Ergebnis' }).click()
  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result.getByText('Was steckt dahinter?')).toBeVisible()
  await result.getByText('Trag dich ein').waitFor()
  // A nickname with a lucky number; the next time it is offered first.
  await result.getByLabel('Glückszahl', { exact: true }).fill('7')
  const name = result.getByTestId('nickname').first()
  const signature = (await name.textContent())!
  expect(signature).toMatch(/ 7$/)
  await name.click()
  await expect(result.locator('ol li')).toHaveCount(1)
  await expect(result.locator('ol li')).toContainText(signature)
  await shot(page, testInfo, 'demo-result')
  await result.getByRole('button', { name: 'Nochmal' }).click()
  await page.getByRole('button', { name: 'Ergebnis' }).click()
  await expect(result.getByTestId('nickname').first()).toHaveAccessibleName(`Wieder als ${signature}`)
})

test('staff menu: open with Ctrl+Shift+S, key test, switch a game off', async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(isMobile, 'keyboard test on the laptop only')
  await page.goto('./')
  await page.keyboard.press('Control+Shift+KeyS')
  const menu = page.getByRole('dialog', { name: 'Personalmenü' })
  await expect(menu).toBeVisible()
  await shot(page, testInfo, 'staff')

  await menu.getByRole('button', { name: 'Tastentest' }).click()
  const keyTest = page.getByRole('dialog', { name: 'Tastentest' })
  await page.keyboard.down('KeyA')
  await page.keyboard.down('KeyL')
  await expect(keyTest.getByText('KeyA + KeyL')).toBeVisible()
  await shot(page, testInfo, 'key-test')
  await page.keyboard.up('KeyA')
  await page.keyboard.up('KeyL')
  await expect(keyTest.getByText('Meiste gleichzeitig: 2')).toBeVisible()
  await keyTest.getByRole('button', { name: 'Personalmenü' }).click()

  await menu.getByRole('button', { name: 'Schwer' }).click()
  await expect(menu.getByRole('button', { name: 'Schwer' })).toHaveAttribute('aria-pressed', 'true')
  await menu.getByRole('button', { name: 'Schließen', exact: true }).last().click()
  await expect(menu).toHaveCount(0)
})

test('kiosk mode returns to the attract screen after 90 s without input', async ({ page }, testInfo) => {
  await page.clock.install()
  await page.goto('./?kiosk#/demo')
  const attract = page.getByRole('dialog', { name: 'Ruler of the Plane' })
  await expect(attract).toBeVisible()
  await shot(page, testInfo, 'attract')
  await attract.click()
  await expect(attract).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Werkstatt' })).toBeVisible()

  await page.clock.fastForward('01:00')
  await expect(attract).toHaveCount(0)
  await page.clock.fastForward('00:35')
  await expect(attract).toBeVisible()
  await expect(page).toHaveURL(/#\/$/)
})

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Ruler of the Plane' })).toBeVisible()
  // Wait until the service worker has precached everything and controls the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve))
    }
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Licht ins Verlies')).toBeVisible()
  await page.goto('./#/demo')
  await expect(page.getByRole('img', { name: 'Werkstatt' })).toBeVisible()
  await context.setOffline(false)
})
