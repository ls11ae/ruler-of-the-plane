import { expect, test } from '@playwright/test'
import { freshDevice, shot, startGame } from './helpers'

freshDevice()

// The result dialog must fit common laptop screens without scrolling, even with a nearly full
// leaderboard and the name picker showing (the longest explanation: Fisk's proof on the first dungeon).
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1366, height: 768 },
]) {
  test(`result dialog fits ${viewport.width} × ${viewport.height} without scrolling`, async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'laptop screens only')
    await page.setViewportSize(viewport)
    await page.addInitScript(() => {
      const d = new Date()
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const names = ['owl', 'fox', 'dragon', 'raven', 'knight', 'owl', 'fox', 'dragon', 'raven']
      const entries = names.map((name, i) => ({ name, score: 3000 + i * 37, day, at: 1000 + i }))
      const booth = { state: { boards: { 'art-gallery/agLevel3_2': entries } }, version: 1 }
      localStorage.setItem('rotp-booth', JSON.stringify(booth))
    })
    await startGame(page, 'art-gallery')
    for (const [x, y] of [
      [2.35, -2.79],
      [1.37, 1.83],
    ] as const) {
      const p = await page
        .locator('svg[role=img] > g')
        .first()
        .evaluate(
          (g, [x, y]) => new DOMPoint(x, y).matrixTransform((g as SVGGElement).getScreenCTM()!),
          [x, y],
        )
      await page.mouse.click(p.x, p.y)
    }
    const result = page.getByRole('dialog', { name: 'Geschafft!' })
    await expect(result.getByText('Trag dich ein')).toBeVisible()
    await expect(result.locator('ol li')).toHaveCount(9)
    const { scrollHeight, clientHeight } = await result.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }))
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight)
    await expect(result.getByRole('button', { name: 'Nächstes Level' })).toBeInViewport()
    await shot(page, testInfo, `result-${viewport.width}x${viewport.height}`)
  })
}
