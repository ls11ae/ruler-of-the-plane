import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { de } from '../src/ui/i18n/de'
import { creditsText, runtimePackages } from './credits'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const credits = readFileSync(join(root, 'CREDITS.md'), 'utf8')
const dependencies = Object.keys(
  (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { dependencies: Record<string, string> })
    .dependencies,
)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(path)
    return /\.(tsx?|css)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : []
  })
}

/** Every asset file the app imports (`import … from '…/assets/…'`, CSS `url('…/assets/…')`), by importer. */
function importedAssets(): { file: string; asset: string }[] {
  const pattern = /(?:from\s+|url\(\s*)['"]([^'"]*\/assets\/[^'"]+)['"]/g
  return sourceFiles(join(root, 'src')).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(pattern)].map((m) => ({
      file: relative(root, file),
      asset: relative(root, resolve(dirname(file), m[1]!)),
    })),
  )
}

/** The asset files listed in each `###` section of CREDITS.md (table rows starting with the file). */
function creditedAssets(): Map<string, Set<string>> {
  const sections = new Map<string, Set<string>>()
  let section = ''
  for (const line of credits.split('\n')) {
    if (line.startsWith('#')) section = line.replace(/^#+\s*/, '')
    for (const m of line.matchAll(/^\| `(assets\/[^`]+)`/g)) {
      if (!sections.has(section)) sections.set(section, new Set())
      sections.get(section)!.add(m[1]!)
    }
  }
  return sections
}

describe('CREDITS.md', () => {
  it('lists every asset file the app uses, in the section of the game that uses it (or "Shared")', () => {
    const sections = creditedAssets()
    const used = importedAssets()
    expect(used.length).toBeGreaterThan(30)
    const missing: string[] = []
    for (const { file, asset } of used) {
      if (asset.startsWith('assets/fonts/')) {
        if (!credits.includes(`\`${asset}\``)) missing.push(`${asset} (fonts, used by ${file})`)
        continue
      }
      const game = /^src\/ui\/games\/([\w-]+)\//.exec(file)?.[1]
      const section = game ? de.places[game as keyof typeof de.places].name : 'Shared'
      if (!sections.get(section)?.has(asset)) missing.push(`${asset} (section "${section}", used by ${file})`)
    }
    expect(missing).toEqual([])
  })

  it('names every runtime library', () => {
    const text = credits.toLowerCase()
    for (const name of dependencies) {
      expect(text.includes(name) || text.includes(name.replace(/-/g, ' ')), name).toBe(true)
    }
  })
})

describe('credits.txt', () => {
  it('holds CREDITS.md and the licence texts of every bundled package and font', () => {
    const text = creditsText(root)
    expect(text.startsWith(credits.trim())).toBe(true)
    const packages = runtimePackages(root)
    for (const name of dependencies) expect(packages).toContain(name)
    expect(packages).toContain('workbox-window')
    expect(packages).toContain('delaunator')
    for (const name of packages) expect(text).toMatch(new RegExp(`^${name} \\S+ \\(`, 'm'))
    expect(text.match(/SIL OPEN FONT LICENSE Version 1\.1/g)).toHaveLength(2)
  })

  it('the credits screen names every runtime library', () => {
    const screen = readFileSync(join(root, 'src/ui/shell/Credits.tsx'), 'utf8')
    for (const name of dependencies) expect(screen, name).toContain(`'${name}'`)
  })
})
