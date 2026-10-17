/**
 * Puts the offline booth package together (see booth/README.md):
 *
 *   Stand/
 *     Start-Stand.cmd, Start-Stand-Firefox.cmd, Stop-Stand.cmd, LIESMICH.txt, VERSION.txt, *.pdf
 *     scripts/   server.ps1, start.ps1, stop.ps1, common.ps1, files.txt (size and path of every file)
 *     web/ruler-of-the-plane/   the app, built with VITE_TSP_BOARDS_URL=/tsp-boards/
 *     web/tsp-boards/           tsp-boards' site (scripts/booth/fetch-tsp-boards.ts)
 *
 *   npx tsx scripts/booth/assemble.ts --app dist --tsp build/tsp-boards --out build/Stand
 *     [--tsp-meta build/tsp-boards.json] [--pdf docs/booth/spickzettel.pdf ...]
 *
 * The Windows scripts get CRLF line ends, the PowerShell scripts a UTF-8 byte order mark (Windows
 * PowerShell 5.1 reads a script without one as ANSI and garbles the umlauts of its messages).
 */
import { execSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const BOOTH = fileURLToPath(new URL('../../booth/', import.meta.url))
const BOM = '\uFEFF'

const crlf = (text: string) => text.replace(/\r?\n/g, '\r\n')

/** Every file below `dir`, as paths relative to `root` with forward slashes. */
export function listFiles(dir: string, root = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    return e.isDirectory() ? listFiles(path, root) : [relative(root, path).split('\\').join('/')]
  })
}

function git(command: string): string {
  try {
    return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

export function assemble(options: {
  app: string
  tsp: string
  out: string
  tspMeta?: string
  pdfs?: string[]
}) {
  const { app, tsp, out } = options
  if (!existsSync(join(app, 'index.html')) || !existsSync(join(app, 'sw.js'))) {
    throw new Error(`${app} is not a build of the app (index.html and sw.js missing): npm run build first`)
  }
  // "Rundreise" must open the local copy of tsp-boards; a build without the variable hides the place.
  const bundled = listFiles(join(app, 'assets'))
    .filter((f) => f.endsWith('.js'))
    .some((f) => /["'`]\/tsp-boards\/["'`]/.test(readFileSync(join(app, 'assets', f), 'utf8')))
  if (!bundled) {
    throw new Error(
      'the app was not built with VITE_TSP_BOARDS_URL=/tsp-boards/ ("Rundreise" would be missing)',
    )
  }
  if (!existsSync(join(tsp, 'index.html'))) throw new Error(`${tsp} holds no tsp-boards site`)

  rmSync(out, { recursive: true, force: true })
  mkdirSync(join(out, 'scripts'), { recursive: true })
  for (const name of readdirSync(BOOTH)) {
    if (name.endsWith('.cmd')) writeFileSync(join(out, name), crlf(readFileSync(join(BOOTH, name), 'utf8')))
  }
  writeFileSync(join(out, 'LIESMICH.txt'), BOM + crlf(readFileSync(join(BOOTH, 'LIESMICH.txt'), 'utf8')))
  for (const name of readdirSync(join(BOOTH, 'scripts'))) {
    if (!name.endsWith('.ps1')) continue
    writeFileSync(join(out, 'scripts', name), BOM + crlf(readFileSync(join(BOOTH, 'scripts', name), 'utf8')))
  }
  cpSync(app, join(out, 'web', 'ruler-of-the-plane'), { recursive: true })
  cpSync(tsp, join(out, 'web', 'tsp-boards'), { recursive: true })
  for (const pdf of options.pdfs ?? []) cpSync(pdf, join(out, basename(pdf)))

  const tspMeta =
    options.tspMeta && existsSync(options.tspMeta) ? JSON.parse(readFileSync(options.tspMeta, 'utf8')) : {}
  const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    version: string
  }
  const commit = process.env.GITHUB_SHA?.slice(0, 7) || git('rev-parse --short HEAD') || 'unknown'
  const ref = process.env.GITHUB_REF_NAME || git('describe --tags --always') || ''
  const lines = [
    'Ruler of the Plane - Stand-Paket',
    '',
    `App:         ${version}+${commit}${ref ? ` (${ref})` : ''}`,
    `Gebaut:      ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    `tsp-boards:  ${tspMeta.version ?? 'unbekannt'}, geladen ${tspMeta.downloaded ?? '?'} von ${tspMeta.source ?? '?'}`,
    `Adresse:     http://localhost:8137/ruler-of-the-plane/?kiosk`,
    '',
  ]
  writeFileSync(join(out, 'VERSION.txt'), BOM + crlf(lines.join('\n')))

  // The start script checks every file against this list (a half-unpacked ZIP, a virus scanner).
  const files = listFiles(out).filter((f) => f !== 'scripts/files.txt')
  const list = files.map((f) => `${statSync(join(out, f)).size}\t${f}`).join('\n') + '\n'
  writeFileSync(join(out, 'scripts', 'files.txt'), list)
  return { files: files.length + 1, bytes: files.reduce((sum, f) => sum + statSync(join(out, f)).size, 0) }
}

function main() {
  const { values } = parseArgs({
    options: {
      app: { type: 'string', default: 'dist' },
      tsp: { type: 'string' },
      'tsp-meta': { type: 'string' },
      out: { type: 'string', default: 'build/Stand' },
      pdf: { type: 'string', multiple: true },
    },
  })
  if (!values.tsp) throw new Error('--tsp <folder of tsp-boards> is missing')
  const result = assemble({
    app: values.app!,
    tsp: values.tsp,
    out: values.out!,
    tspMeta: values['tsp-meta'] ?? `${values.tsp.replace(/[\\/]+$/, '')}.json`,
    pdfs: values.pdf,
  })
  console.log(`${values.out}: ${result.files} files, ${(result.bytes / 1e6).toFixed(1)} MB`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
