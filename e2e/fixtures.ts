import { test as base } from '@playwright/test'

export * from '@playwright/test'

/**
 * `test` with the option `phone`: true in the phone projects of every browser. Playwright's `isMobile`
 * cannot say it, since Firefox does not support it (its phone project has touch and a coarse pointer,
 * see `playwright.config.ts`).
 */
export const test = base.extend<{ phone: boolean }>({
  phone: [false, { option: true }],
})
