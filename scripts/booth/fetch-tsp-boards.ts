/**
 * Downloads the static site of tsp-boards (default https://ls11ae.github.io/tsp-boards/) into a folder,
 * for the booth package, where it is served at /tsp-boards/ next to the app ("Rundreise" in kiosk mode).
 *
 * tsp-boards has no service worker and no file list, so the site is crawled: from index.html through
 * every reference in HTML (src, href), CSS (url()), JavaScript (relative module imports, `new URL(…,
 * import.meta.url)` for workers and the HiGHS WebAssembly, bare file names such as "puzzles/index.json")
 * and JSON ("file" entries: the countries of data/manifest.json, the puzzles of puzzles/index.json). A
 * reference that must exist and is missing fails the download, and so do a site without a worker or
 * WebAssembly file, an empty file, or a reference to another site in the HTML (offline it would break).
 *
 *   npx tsx scripts/booth/fetch-tsp-boards.ts --out build/tsp-boards [--url <site>] [--meta <file.json>]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

export const DEFAULT_URL = 'https://ls11ae.github.io/tsp-boards/'

/** Files the site needs that nothing references in a way the crawler must follow (fetched by the app). */
const SEEDS = [
  'index.html',
  'favicon.svg',
  'third-party-licenses.txt',
  'data/manifest.json',
  'puzzles/index.json',
]

const FILE_EXT = 'js|mjs|css|wasm|json|svg|png|webp|jpe?g|gif|ico|woff2?|ttf|otf|txt|webmanifest|html'
const TEXT_EXT = /\.(html|js|mjs|css|json|webmanifest)$/i

interface Ref {
  url: string
  required: boolean
  from: string
  /** Another address to try if this one is missing (JavaScript: relative to the page or the module). */
  fallback?: string
}

export interface Download {
  files: Map<string, Buffer>
  missing: string[]
  problems: string[]
  version: string | null
}

const strip = (u: string) => u.replace(/[?#].*$/, '')

function resolveIn(base: string, ref: string): string | null {
  if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref) || ref.includes('${')) return null
  try {
    return strip(new URL(ref, base).href)
  } catch {
    return null
  }
}

/** References in one downloaded file. */
export function referencesIn(url: string, text: string, site: string): { refs: Ref[]; external: string[] } {
  const refs: Ref[] = []
  const external: string[] = []
  const add = (ref: string, required: boolean, base = url, fallbackBase?: string) => {
    const resolved = resolveIn(base, ref)
    const fallback = fallbackBase ? (resolveIn(fallbackBase, ref) ?? undefined) : undefined
    if (resolved) refs.push({ url: resolved, required, from: url, fallback })
  }
  if (/\.html$/i.test(url)) {
    for (const m of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const ref = m[1]!
      if (/^(?:https?:)?\/\//i.test(ref)) external.push(ref)
      else add(ref, true)
    }
  } else if (/\.css$/i.test(url)) {
    for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(m[1]!, true)
    for (const m of text.matchAll(/@import\s+["']([^"']+)["']/gi)) add(m[1]!, true)
  } else if (/\.m?js$/i.test(url)) {
    // Workers and WebAssembly: new URL(`name.js`, import.meta.url), relative to the module.
    for (const m of text.matchAll(/new URL\(\s*["'`]([^"'`]+)["'`]\s*,\s*import\.meta\.url\s*\)/g))
      add(m[1]!, true)
    // Relative paths ("./chunk.js"): module imports and preload lists resolve them against the module,
    // fetch() against the page (Vite's relative base turns BASE_URL into "./"), so try both.
    for (const m of text.matchAll(new RegExp(`["'\`](\\.{1,2}/[\\w@~./-]+\\.(?:${FILE_EXT}))["'\`]`, 'g'))) {
      add(m[1]!, true, url, site)
    }
    // Bare file names ("puzzles/index.json", "third-party-licenses.txt"): fetched by the page, so first
    // relative to the site, then to the module. Many are not addresses at all (download names), hence
    // optional.
    for (const m of text.matchAll(new RegExp(`["'\`]([\\w@~-][\\w@~./-]*\\.(?:${FILE_EXT}))["'\`]`, 'g'))) {
      add(m[1]!, false, site, url)
    }
  } else if (/\.(json|webmanifest)$/i.test(url)) {
    const visit = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === 'object') {
        for (const [key, v] of Object.entries(value)) {
          if ((key === 'file' || key === 'src') && typeof v === 'string') add(v, true)
          else visit(v)
        }
      }
    }
    try {
      visit(JSON.parse(text))
    } catch {
      // not JSON: nothing to follow
    }
  }
  return { refs, external }
}

async function get(url: string): Promise<{ status: number; body: Buffer }> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      const body = Buffer.from(await res.arrayBuffer())
      if (res.status >= 500 && attempt < 4) throw new Error(`HTTP ${res.status}`)
      return { status: res.status, body }
    } catch (error) {
      if (attempt >= 4) throw new Error(`${url}: ${(error as Error).message}`, { cause: error })
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
    }
  }
}

/** Crawls the site below `site` (which must end with a slash). */
export async function crawl(site: string, log: (line: string) => void = () => {}): Promise<Download> {
  if (!site.endsWith('/')) site += '/'
  const files = new Map<string, Buffer>()
  const missing: string[] = []
  const problems: string[] = []
  // One download per address, however often it is referenced; each file is read for references once.
  const downloads = new Map<string, Promise<{ status: number; body: Buffer }>>()
  const fetchOnce = (url: string) => {
    if (!downloads.has(url)) downloads.set(url, get(url))
    return downloads.get(url)!
  }
  const handled = new Set<string>()
  const queue: Ref[] = SEEDS.map((s) => ({ url: new URL(s, site).href, required: true, from: '(seed)' }))
  while (queue.length) {
    const batch = queue.splice(0, 8)
    await Promise.all(
      batch.map(async (ref) => {
        const candidates = [ref.url, ref.fallback].filter((u): u is string => !!u && u.startsWith(site))
        let found: { url: string; body: Buffer } | null = null
        let status = 0
        for (const url of candidates) {
          const res = await fetchOnce(url)
          status = res.status
          if (res.status === 200) {
            found = { url, body: res.body }
            break
          }
        }
        if (!found) {
          if (ref.required && candidates.length) {
            missing.push(`${candidates.join(' or ')} (HTTP ${status}, referenced by ${ref.from})`)
          }
          return
        }
        if (handled.has(found.url)) return
        handled.add(found.url)
        const path = decodeURIComponent(found.url.slice(site.length)) || 'index.html'
        if (found.body.length === 0) problems.push(`${path} is empty`)
        files.set(path, found.body)
        log(`${String(found.body.length).padStart(9)}  ${path}`)
        if (TEXT_EXT.test(path)) {
          const { refs, external } = referencesIn(found.url, found.body.toString('utf8'), site)
          queue.push(...refs)
          for (const e of external) problems.push(`${path} loads ${e} from another site (breaks offline)`)
        }
      }),
    )
  }
  const paths = [...files.keys()]
  if (!paths.some((p) => p.endsWith('.wasm'))) problems.push('no WebAssembly file (HiGHS) found')
  if (!paths.some((p) => /worker/i.test(p) && p.endsWith('.js'))) problems.push('no worker script found')
  if (!paths.some((p) => /^puzzles\/.+\.tsp\.json$/.test(p))) problems.push('no puzzle found')
  let version: string | null = null
  for (const [path, body] of files) {
    if (!/^assets\/index-.*\.js$/.test(path)) continue
    version = /["'`](\d+\.\d+\.\d+\+[0-9a-f]{7,40})["'`]/.exec(body.toString('utf8'))?.[1] ?? version
  }
  return { files, missing: missing.sort(), problems, version }
}

async function main() {
  const { values } = parseArgs({
    options: {
      url: { type: 'string', default: DEFAULT_URL },
      out: { type: 'string' },
      meta: { type: 'string' },
      quiet: { type: 'boolean', default: false },
    },
  })
  if (!values.out) throw new Error('--out <folder> is missing')
  const site = values.url!.endsWith('/') ? values.url! : `${values.url}/`
  console.log(`Downloading tsp-boards from ${site}`)
  const result = await crawl(site, values.quiet ? undefined : console.log)
  if (result.missing.length || result.problems.length) {
    console.error('\ntsp-boards is incomplete:')
    for (const m of result.missing) console.error(`  missing: ${m}`)
    for (const p of result.problems) console.error(`  ${p}`)
    process.exit(1)
  }
  let bytes = 0
  for (const [path, body] of result.files) {
    const file = join(values.out, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, body)
    bytes += body.length
  }
  const meta = {
    source: site,
    downloaded: new Date().toISOString(),
    version: result.version,
    files: result.files.size,
    bytes,
  }
  writeFileSync(
    values.meta ?? `${values.out.replace(/[\\/]+$/, '')}.json`,
    JSON.stringify(meta, null, 2) + '\n',
  )
  console.log(
    `\n${result.files.size} files, ${(bytes / 1e6).toFixed(1)} MB, version ${result.version ?? 'unknown'}`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
