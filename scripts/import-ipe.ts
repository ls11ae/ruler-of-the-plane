/**
 * `npm run levels`: converts the Unity levels in `legacy/levels/` (IPE files and five Unity `.asset`
 * files) and the new levels in `levels/` (IPE maps of "Erobere das Land") to JSON in `public/levels/`. The output is committed; a test checks that it matches a fresh
 * import. Format: `src/core/levels/schema.ts`; rules: `docs/legacy-unity-notes.md`.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertAll, levelFiles } from './levels/import'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const legacyDir = join(root, 'legacy', 'levels')
const levelsDir = join(root, 'levels')
const outDir = join(root, 'public', 'levels')

function listJson(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => relative(dir, join(e.parentPath, e.name)).split('\\').join('/'))
}

const files = levelFiles(convertAll(legacyDir, levelsDir))
mkdirSync(outDir, { recursive: true })
for (const stale of listJson(outDir).filter((f) => !files.has(f))) {
  rmSync(join(outDir, stale))
  console.log(`removed ${stale}`)
}
for (const [path, content] of files) {
  const target = join(outDir, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}
console.log(`wrote ${files.size - 1} levels and index.json to ${relative(root, outDir)}/`)
