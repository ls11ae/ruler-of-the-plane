import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crawl } from './fetch-tsp-boards'

/** A small site shaped like tsp-boards' build (relative base, workers, WebAssembly, data lists). */
const SITE: Record<string, string> = {
  'index.html': `<!doctype html><link rel="icon" href="./favicon.svg">
<script type="module" crossorigin src="./assets/index-AbC123.js"></script>
<link rel="stylesheet" href="./assets/index-AbC123.css">`,
  'favicon.svg': '<svg/>',
  'third-party-licenses.txt': 'MIT',
  'assets/index-AbC123.js': `import{a}from"./store-X1.js";const v="0.9.0+e4277dc";
fetch(\`./data/manifest.json\`);fetch(\`./puzzles/index.json\`);fetch(\`./puzzles/\${id}\`);
new Worker(new URL(\`exact.worker-Q9.js\`,import.meta.url),{type:"module"});
const name="board.svg";const link=\`third-party-licenses.txt\``,
  'assets/store-X1.js': 'export const a=1',
  'assets/index-AbC123.css':
    '@font-face{src:url(./font-Z.woff2)}body{background:url("data:image/png;base64,AA")}',
  'assets/font-Z.woff2': 'font',
  'assets/exact.worker-Q9.js':
    'const w=new URL(`highs-H7.wasm`,import.meta.url);await import(`./node-module-stub-S.js`)',
  'assets/node-module-stub-S.js': 'export {}',
  'assets/highs-H7.wasm': 'wasm',
  'data/manifest.json': JSON.stringify({
    countries: [{ file: 'countries/de.json' }, { file: 'countries/at.json' }],
  }),
  'data/countries/de.json': '{}',
  'data/countries/at.json': '{}',
  'puzzles/index.json': JSON.stringify({
    puzzles: [{ file: 'nrw-25.tsp.json' }, { file: 'welt-30.tsp.json' }],
  }),
  'puzzles/nrw-25.tsp.json': '{}',
  'puzzles/welt-30.tsp.json': '{}',
}

let site: Record<string, string> = SITE
let server: Server
let base: string

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').replace(/^\/tsp-boards\//, '').replace(/\?.*$/, ''))
    const body = site[path || 'index.html']
    res.writeHead(body === undefined ? 404 : 200).end(body ?? 'not found')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/tsp-boards/`
})

afterAll(() => {
  server.close()
})

describe('fetch-tsp-boards', () => {
  it('downloads every file the site references, and only those', async () => {
    site = SITE
    const result = await crawl(base)
    expect(result.missing).toEqual([])
    expect(result.problems).toEqual([])
    expect([...result.files.keys()].sort()).toEqual(Object.keys(SITE).sort())
    expect(result.version).toBe('0.9.0+e4277dc')
  })

  it('fails loudly when a referenced file is missing', async () => {
    site = { ...SITE }
    delete site['assets/highs-H7.wasm']
    delete site['puzzles/welt-30.tsp.json']
    const result = await crawl(base)
    expect(result.missing.join('\n')).toMatch(/highs-H7\.wasm/)
    expect(result.missing.join('\n')).toMatch(/welt-30\.tsp\.json.*puzzles\/index\.json/)
    expect(result.problems).toContain('no WebAssembly file (HiGHS) found')
  })

  it('reports a script from another site, which would break offline', async () => {
    site = {
      ...SITE,
      'index.html': SITE['index.html'] + '<script src="https://cdn.example.org/x.js"></script>',
    }
    const result = await crawl(base)
    expect(result.problems.join('\n')).toMatch(/cdn\.example\.org/)
  })
})
