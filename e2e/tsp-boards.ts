import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { expect, type BrowserContext, type Page } from '@playwright/test'

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
export async function serveTspBoards(context: BrowserContext, base: URL) {
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
export async function tspBoardsAddress(page: Page): Promise<URL | null> {
  await page.goto('./')
  const link = page.getByRole('link', { name: /Rundreise/ })
  await expect(page.getByRole('heading', { name: 'Ruler of the Plane' })).toBeVisible()
  if (!(await link.count())) return null
  await expect(link).toHaveAttribute('target', '_blank')
  return new URL((await link.getAttribute('href'))!, page.url())
}
