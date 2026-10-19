import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { mulberry32 } from '../../src/core/random'

/**
 * The rock around the dungeons of "Licht ins Verlies" and inside their pillars (Kevin, 2026-10-19: the
 * light hatching made pillars look like rooms): groups of four to six short parallel ink strokes in
 * random directions, as rock is drawn on hand-made dungeon maps. A seamless 144 px tile (strokes near an
 * edge are repeated on the other side); `npx tsx scripts/art-gallery/rock-tile.ts` writes
 * `src/ui/games/art-gallery/rock.svg` (committed), which the game lays over a stone-coloured background.
 */

const SIZE = 144
const GROUPS = 60
const SPACING = 16
const GAP = 3

/** The tile as an SVG document (deterministic: seeded strokes). */
export function rockTile(): string {
  const rng = mulberry32(7)
  const between = (a: number, b: number) => a + rng() * (b - a)

  // Group centres at least SPACING apart, also across the tile's edges.
  const centres: [number, number][] = []
  for (let tries = 0; centres.length < GROUPS && tries < 20000; tries++) {
    const [x, y] = [rng() * SIZE, rng() * SIZE]
    const apart = centres.every(([px, py]) => {
      const dx = Math.min(Math.abs(px - x), SIZE - Math.abs(px - x))
      const dy = Math.min(Math.abs(py - y), SIZE - Math.abs(py - y))
      return dx * dx + dy * dy >= SPACING * SPACING
    })
    if (apart) centres.push([x, y])
  }

  const segments: string[] = []
  for (const [x, y] of centres) {
    const angle = rng() * Math.PI
    const strokes = 4 + Math.floor(rng() * 3)
    const length = between(11, 17)
    const [ux, uy] = [Math.cos(angle), Math.sin(angle)]
    for (let i = 0; i < strokes; i++) {
      const middle = (strokes - 1) / 2
      const offset = (i - middle) * GAP
      // Outer strokes shorter, so each group is roughly round.
      const l = length * (1 - (0.35 * Math.abs(i - middle)) / middle) * between(0.85, 1.1)
      const [cx, cy] = [x - uy * offset, y + ux * offset]
      const [x1, y1, x2, y2] = [cx - (ux * l) / 2, cy - (uy * l) / 2, cx + (ux * l) / 2, cy + (uy * l) / 2]
      for (const sx of [-SIZE, 0, SIZE]) {
        for (const sy of [-SIZE, 0, SIZE]) {
          const [a, b, c, d] = [x1 + sx, y1 + sy, x2 + sx, y2 + sy]
          if (Math.max(a, c) < -2 || Math.min(a, c) > SIZE + 2) continue
          if (Math.max(b, d) < -2 || Math.min(b, d) > SIZE + 2) continue
          segments.push(`M${a.toFixed(1)} ${b.toFixed(1)}L${c.toFixed(1)} ${d.toFixed(1)}`)
        }
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">` +
    `<path d="${segments.join('')}" stroke="#2b2420" stroke-opacity="0.3" stroke-width="1.3" ` +
    `stroke-linecap="round" fill="none"/></svg>\n`
  )
}

export const ROCK_FILE = join(
  import.meta.dirname,
  '..',
  '..',
  'src',
  'ui',
  'games',
  'art-gallery',
  'rock.svg',
)

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const svg = rockTile()
  writeFileSync(ROCK_FILE, svg)
  console.log(`rock.svg: ${svg.length} bytes`)
}
