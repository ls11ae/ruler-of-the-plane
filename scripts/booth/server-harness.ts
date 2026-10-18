/**
 * Starts the booth server (`booth/scripts/server.ps1`) under PowerShell and checks what it serves.
 * Used by `server.test.ts` (Vitest, when `pwsh` is installed: CI's Ubuntu runners have it) and by
 * `check-package.ts` (the booth workflow, also under Windows PowerShell 5.1).
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SERVER_SCRIPT = fileURLToPath(new URL('../../booth/scripts/server.ps1', import.meta.url))

/** The PowerShell to test with: `$PWSH`, else `pwsh` if it runs; null if there is none. */
export function findPowerShell(): string | null {
  const candidates = [process.env.PWSH, 'pwsh'].filter((c): c is string => !!c)
  for (const shell of candidates) {
    const probe = spawnSync(shell, ['-NoLogo', '-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major'], {
      encoding: 'utf8',
    })
    if (probe.status === 0) return shell
  }
  return null
}

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      probe.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject()))
    })
  })
}

export interface RunningServer {
  base: string
  process: ChildProcess
  stopFile: string
  log: string
  output: () => string
  /** Creates the stop file and waits until the process has ended. */
  stop: () => Promise<number | null>
}

/** Starts server.ps1 on `root` and waits until it answers its ping. */
export async function startServer(
  shell: string,
  root: string,
  options: { script?: string; port?: number; work?: string } = {},
): Promise<RunningServer> {
  const port = options.port ?? (await freePort())
  const work = options.work ?? mkdtempSync(join(tmpdir(), 'stand-server-'))
  const stopFile = join(work, 'stop.flag')
  const log = join(work, 'server.log')
  const args = [
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    options.script ?? SERVER_SCRIPT,
  ]
  args.push('-Root', root, '-Port', String(port), '-Log', log, '-StopFile', stopFile)
  const child = spawn(shell, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', (d: Buffer) => (output += d.toString()))
  child.stderr.on('data', (d: Buffer) => (output += d.toString()))
  const exited = new Promise<number | null>((resolve) => child.once('exit', (code) => resolve(code)))
  const base = `http://localhost:${port}`
  const deadline = Date.now() + 30_000
  for (;;) {
    if (child.exitCode !== null) throw new Error(`server.ps1 ended with ${child.exitCode}:\n${output}`)
    try {
      const res = await fetch(`${base}/__stand/ping`)
      if ((await res.text()) === 'ruler-of-the-plane-stand') break
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) {
      child.kill()
      throw new Error(`server.ps1 did not answer within 30 s:\n${output}`)
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  return {
    base,
    process: child,
    stopFile,
    log,
    output: () => output,
    stop: async () => {
      writeFileSync(stopFile, '')
      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => {
          child.kill()
          resolve(null)
        }, 10_000),
      )
      return Promise.race([exited, timeout])
    },
  }
}

/** A folder with one file per MIME type, a folder without index, hidden files and a secret next to it. */
export function makeFixture(): { root: string; files: Record<string, Buffer> } {
  const dir = mkdtempSync(join(tmpdir(), 'stand-fixture-'))
  const root = join(dir, 'web')
  const files: Record<string, Buffer> = {
    'ruler-of-the-plane/index.html': Buffer.from('<!doctype html><title>app</title>'),
    'ruler-of-the-plane/sw.js': Buffer.from('self.addEventListener("fetch", () => {})'),
    'ruler-of-the-plane/manifest.webmanifest': Buffer.from('{"name":"Ruler"}'),
    'ruler-of-the-plane/assets/index-abc.js': Buffer.from('export const a = 1'),
    'ruler-of-the-plane/assets/chunk.mjs': Buffer.from('export const b = 2'),
    'ruler-of-the-plane/assets/index-abc.css': Buffer.from('body{}'),
    'ruler-of-the-plane/assets/font.woff2': randomBytes(2048),
    'ruler-of-the-plane/assets/font.ttf': randomBytes(1024),
    'ruler-of-the-plane/assets/icon.svg': Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    'ruler-of-the-plane/assets/tile.png': randomBytes(512),
    'ruler-of-the-plane/assets/tile.webp': randomBytes(512),
    'ruler-of-the-plane/levels/index.json': Buffer.from('{"levels":[]}'),
    'ruler-of-the-plane/credits.txt': Buffer.from('Credits äöü'),
    'tsp-boards/index.html': Buffer.from('<!doctype html><title>tsp</title>'),
    'tsp-boards/assets/highs.wasm': randomBytes(1 << 20),
    'tsp-boards/.htaccess': Buffer.from('secret htaccess'),
    'tsp-boards/data/manifest.json': Buffer.from('{}'),
    'nolisting/a.txt': Buffer.from('listed?'),
    '.hidden/b.txt': Buffer.from('hidden'),
    'with space/x y.txt': Buffer.from('spaced'),
  }
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), body)
  }
  writeFileSync(join(dir, 'secret.txt'), 'outside the root')
  return { root, files }
}

/** What each extension must be served as (the browser refuses module workers and wasm otherwise). */
export const EXPECTED_TYPES: Record<string, RegExp> = {
  '.html': /^text\/html/,
  '.js': /^text\/javascript/,
  '.mjs': /^text\/javascript/,
  '.css': /^text\/css/,
  '.json': /^application\/json/,
  '.webmanifest': /^application\/manifest\+json/,
  '.svg': /^image\/svg\+xml$/,
  '.png': /^image\/png$/,
  '.webp': /^image\/webp$/,
  '.woff2': /^font\/woff2$/,
  '.ttf': /^font\/ttf$/,
  '.wasm': /^application\/wasm$/,
  '.txt': /^text\/plain/,
  '.pdf': /^application\/pdf$/,
}

export function extension(path: string): string {
  const m = /\.[^./]+$/.exec(path)
  return m ? m[0].toLowerCase() : ''
}

/** A raw request, so that paths like `/../` reach the server as written (fetch would normalise them). */
export async function rawGet(base: string, path: string): Promise<{ status: number; body: string }> {
  const { request } = await import('node:http')
  const url = new URL(base)
  return new Promise((resolve, reject) => {
    const req = request(
      { host: url.hostname, port: url.port, path, method: 'GET', headers: { Host: url.host } },
      (res) => {
        let body = ''
        res.on('data', (d: Buffer) => (body += d.toString()))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
      },
    )
    req.on('error', reject)
    req.end()
  })
}

/**
 * The server's contract, checked against a fixture from `makeFixture()`; returns the failures (empty
 * when everything holds).
 */
export async function checkContract(base: string, files: Record<string, Buffer>): Promise<string[]> {
  const failures: string[] = []
  const expect = (ok: boolean, what: string) => {
    if (!ok) failures.push(what)
  }
  const get = (path: string, init?: RequestInit) => fetch(base + path, { redirect: 'manual', ...init })

  let res = await get('/')
  expect(
    res.status === 302 && res.headers.get('location') === '/ruler-of-the-plane/',
    `/ redirects (${res.status})`,
  )
  res = await get('/?kiosk')
  expect(res.headers.get('location') === '/ruler-of-the-plane/?kiosk', '/?kiosk keeps the query')
  res = await get('/ruler-of-the-plane')
  expect(res.status === 301 && res.headers.get('location') === '/ruler-of-the-plane/', 'folder without slash')
  res = await get('/ruler-of-the-plane/?kiosk')
  expect(res.status === 200 && (await res.text()).includes('<title>app</title>'), 'folder serves index.html')
  expect(/^text\/html/.test(res.headers.get('content-type') ?? ''), 'index.html as text/html')

  for (const [path, body] of Object.entries(files)) {
    if (path.split('/').some((p) => p.startsWith('.')) || path.startsWith('nolisting/')) continue
    const encoded = '/' + path.split('/').map(encodeURIComponent).join('/')
    res = await get(encoded)
    const got = Buffer.from(await res.arrayBuffer())
    expect(res.status === 200, `${path}: status ${res.status}`)
    expect(got.equals(body), `${path}: body differs (${got.length} of ${body.length} bytes)`)
    const type = EXPECTED_TYPES[extension(path)]
    if (type)
      expect(
        type.test(res.headers.get('content-type') ?? ''),
        `${path}: type ${res.headers.get('content-type')}`,
      )
    expect(res.headers.get('x-content-type-options') === 'nosniff', `${path}: nosniff`)
  }

  res = await get('/nolisting/')
  const listing = await res.text()
  expect(res.status === 404 && !listing.includes('a.txt'), `no directory listing (${res.status})`)
  for (const path of [
    '/tsp-boards/.htaccess',
    '/.hidden/b.txt',
    '/missing.js',
    '/ruler-of-the-plane/nope/',
  ]) {
    res = await get(path)
    expect(res.status === 404, `${path} is 404 (${res.status})`)
  }
  for (const path of [
    '/../secret.txt',
    '/ruler-of-the-plane/../../secret.txt',
    '/%2e%2e/secret.txt',
    '/ruler-of-the-plane/%2e%2e%2f%2e%2e%2fsecret.txt',
    '/..%5csecret.txt',
    '/ruler-of-the-plane/..%5c..%5csecret.txt',
    '/%2e%2e%5csecret.txt',
  ]) {
    const raw = await rawGet(base, path)
    expect(
      raw.status !== 200 && !raw.body.includes('outside the root'),
      `${path} stays inside the root (${raw.status})`,
    )
  }

  res = await get('/tsp-boards/assets/highs.wasm', { method: 'HEAD' })
  expect(res.status === 200 && res.headers.get('content-length') === String(1 << 20), 'HEAD gives the length')
  expect((await res.arrayBuffer()).byteLength === 0, 'HEAD has no body')
  res = await get('/ruler-of-the-plane/index.html', { method: 'POST', body: 'x' })
  expect(res.status === 405, `POST is refused (${res.status})`)
  res = await get('/ruler-of-the-plane/sw.js')
  const modified = res.headers.get('last-modified')
  expect(!!modified && res.headers.get('cache-control') === 'no-cache', 'Last-Modified and no-cache')
  res = await get('/ruler-of-the-plane/sw.js', { headers: { 'If-Modified-Since': modified ?? '' } })
  expect(res.status === 304, `unchanged file answers 304 (${res.status})`)
  res = await get('/ruler-of-the-plane/sw.js', {
    headers: { 'If-Modified-Since': 'Thu, 01 Jan 2004 00:00:00 GMT' },
  })
  expect(res.status === 200, `changed file answers 200 (${res.status})`)
  const other = await rawGet(base.replace('localhost', '127.0.0.1'), '/ruler-of-the-plane/').catch(() => null)
  expect(!other || other.status !== 200, 'only the host name localhost is served')

  // A browser loads many files at once.
  const paths = Array.from({ length: 30 }, (_, i) => Object.keys(files)[i % 13]!)
  const all = await Promise.all(paths.map((p) => get('/' + p).then((r) => r.status)))
  expect(
    all.every((s) => s === 200),
    `30 parallel requests: ${all.filter((s) => s !== 200).length} failed`,
  )
  return failures
}
