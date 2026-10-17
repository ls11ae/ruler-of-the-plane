import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Name of the text the build writes next to the app: CREDITS.md and every licence text. */
export const CREDITS_FILE = 'credits.txt'

/**
 * Code that runs in the app without being one of its `dependencies`: Workbox from vite-plugin-pwa (the
 * service worker and its registration).
 */
const EXTRA_PACKAGES = ['workbox-window', 'workbox-precaching']

/** The fonts the app bundles, with their licence files (SIL OFL 1.1, which asks for its text). */
const FONTS = [
  { name: 'Eagle Lake', licence: 'assets/fonts/EagleLake-OFL.txt' },
  { name: 'Patrick Hand', licence: 'assets/fonts/PatrickHand-OFL.txt' },
]

type PackageJson = { version?: string; license?: string; dependencies?: Record<string, string> }

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as PackageJson

/** The packages bundled into the app: the runtime dependencies, Workbox, and what they depend on. */
export function runtimePackages(root: string): string[] {
  const seen = new Set<string>()
  const visit = (name: string) => {
    if (seen.has(name) || name.startsWith('@types/')) return
    seen.add(name)
    for (const dep of Object.keys(
      readJson(join(root, 'node_modules', name, 'package.json')).dependencies ?? {},
    )) {
      visit(dep)
    }
  }
  for (const dep of Object.keys(readJson(join(root, 'package.json')).dependencies ?? {})) visit(dep)
  for (const dep of EXTRA_PACKAGES) visit(dep)
  return [...seen].sort()
}

function packageSection(root: string, name: string): string {
  const dir = join(root, 'node_modules', name)
  const pkg = readJson(join(dir, 'package.json'))
  const file = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f))
  const text = file ? readFileSync(join(dir, file), 'utf8').trim() : `Licence: ${pkg.license ?? 'unknown'}`
  return `${name} ${pkg.version ?? ''} (${pkg.license ?? 'unknown'})\n\n${text}`
}

/**
 * The credits as plain text for the app's credits screen ("Alle Dateien und Lizenztexte"): CREDITS.md
 * with every asset file, then the licence texts of the bundled packages and fonts (MIT, ISC, BSL and the
 * OFL ask for their notices with every copy).
 */
export function creditsText(root: string): string {
  const rule = `\n\n${'-'.repeat(78)}\n\n`
  const credits = readFileSync(join(root, 'CREDITS.md'), 'utf8').trim()
  const packages = runtimePackages(root).map((name) => packageSection(root, name))
  const fonts = FONTS.map(
    (f) => `${f.name} (OFL-1.1)\n\n${readFileSync(join(root, f.licence), 'utf8').trim()}`,
  )
  const heading = 'Licence texts of the bundled libraries and fonts'
  return [credits, heading, ...packages, ...fonts].join(rule) + '\n'
}
