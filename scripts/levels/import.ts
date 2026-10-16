import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COLLECTIONS, LEVEL_FORMAT_VERSION, type Level, type LevelIndex } from '../../src/core/levels/schema'
import { convertLevel, FOLDERS, NEW_FOLDERS } from './convert'

/** JSON with two-space indentation, but number pairs (points) and bounds on one line. */
export function formatJson(value: unknown): string {
  return (
    JSON.stringify(value, null, 2)
      .replace(/\[\s+(-?[\d.e+-]+),\s+(-?[\d.e+-]+)\s+\]/g, '[$1, $2]')
      .replace(
        /\{\s+("minX": [^,]+),\s+("minY": [^,]+),\s+("maxX": [^,]+),\s+("maxY": [^\s}]+)\s+\}/g,
        '{ $1, $2, $3, $4 }',
      ) + '\n'
  )
}

/**
 * Converts every level below `legacyDir` (Unity levels) and `levelsDir` (new levels); returns the levels
 * in order per collection (Unity order, or the number in the file name).
 */
export function convertAll(legacyDir: string, levelsDir: string): Level[] {
  const levels: Level[] = []
  const folders = [
    ...Object.entries(FOLDERS).map(([folder, collection]) => ({
      folder,
      collection,
      root: legacyDir,
      fresh: false,
    })),
    ...Object.entries(NEW_FOLDERS).map(([folder, collection]) => ({
      folder,
      collection,
      root: levelsDir,
      fresh: true,
    })),
  ]
  for (const { folder, collection, root, fresh } of folders) {
    const dir = join(root, folder)
    const files = readdirSync(dir).filter((f) => f.endsWith('.ipe') || f.endsWith('.asset'))
    const converted = files.map((f) => convertLevel(folder, f, readFileSync(join(dir, f), 'utf8'), fresh))
    converted.sort((a, b) => a.number - b.number)
    for (let i = 1; i < converted.length; i++) {
      if (converted[i]!.number === converted[i - 1]!.number) {
        throw new Error(`${collection}: two levels with number ${converted[i]!.number}`)
      }
    }
    levels.push(...converted)
  }
  return levels
}

/** The files of `public/levels/` (path relative to it → content) for the given levels. */
export function levelFiles(levels: Level[]): Map<string, string> {
  const files = new Map<string, string>()
  const index: LevelIndex = {
    version: LEVEL_FORMAT_VERSION,
    collections: Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as LevelIndex['collections'],
  }
  for (const level of levels) {
    index.collections[level.collection].push(level.id)
    files.set(`${level.id}.json`, formatJson(level))
  }
  files.set('index.json', formatJson(index))
  return files
}
