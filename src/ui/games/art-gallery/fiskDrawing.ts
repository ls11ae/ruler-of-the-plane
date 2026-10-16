import type { Vec2 } from '../../../core/geometry/types'
import type { ArtGalleryLevel } from '../../../core/levels/schema'

/** The three colours of Fisk's proof, each with its own shape (colour is never the only cue). */
export const FISK_COLOURS = ['#d6403a', '#2f9e5a', '#2f6fd0'] as const

/** Diagonals of a triangulation (sides that are not walls), each once. */
export function diagonals(
  level: ArtGalleryLevel,
  triangles: readonly (readonly number[])[],
  points: readonly Vec2[],
) {
  const n = points.length
  const ringOf: number[] = []
  const starts = [0]
  for (const ring of [level.outer, ...level.holes]) starts.push(starts[starts.length - 1]! + ring.length)
  for (let r = 0; r < starts.length - 1; r++) for (let i = starts[r]!; i < starts[r + 1]!; i++) ringOf[i] = r
  const isWall = (a: number, b: number) => {
    if (ringOf[a] !== ringOf[b]) return false
    const s = starts[ringOf[a]!]!
    const len = starts[ringOf[a]! + 1]! - s
    return b - s === (a - s + 1) % len || a - s === (b - s + 1) % len
  }
  const seen = new Set<string>()
  const out: [Vec2, Vec2][] = []
  for (const tri of triangles) {
    for (let k = 0; k < 3; k++) {
      const a = tri[k]!
      const b = tri[(k + 1) % 3]!
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      if (seen.has(key) || isWall(a, b) || a >= n || b >= n) continue
      seen.add(key)
      out.push([points[a]!, points[b]!])
    }
  }
  return out
}
