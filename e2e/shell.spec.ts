import { expect, test } from '@playwright/test'

test('start screen loads', async ({ page }, testInfo) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Ruler of the Plane' })).toBeVisible()
  await page.screenshot({ path: `screenshots/${testInfo.project.name}/start.png` })
})
