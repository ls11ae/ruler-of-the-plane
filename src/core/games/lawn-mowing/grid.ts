import type { Vec2 } from '../../geometry/types'

/**
 * Lawn mowing works on the integer grid of CG:SHOP 2027 (pyutils27): cell (x, y) is the unit square
 * [x, x + 1] × [y, y + 1], y points up; positions of a cutter are lattice points.
 */

/** A set of cells, stored as a mask over a bounding box (`mask[(y - y0) * width + (x - x0)]`). */
export class CellGrid {
  readonly mask: Uint8Array

  constructor(
    readonly x0: number,
    readonly y0: number,
    readonly width: number,
    readonly height: number,
    mask?: Uint8Array,
  ) {
    this.mask = mask ?? new Uint8Array(width * height)
  }

  index(x: number, y: number): number {
    const cx = x - this.x0
    const cy = y - this.y0
    return cx < 0 || cy < 0 || cx >= this.width || cy >= this.height ? -1 : cy * this.width + cx
  }

  has(x: number, y: number): boolean {
    const i = this.index(x, y)
    return i >= 0 && this.mask[i] === 1
  }

  get count(): number {
    let n = 0
    for (const v of this.mask) n += v
    return n
  }

  /** The cells of the set, row by row (y ascending, then x). */
  cells(): Vec2[] {
    const out: Vec2[] = []
    for (let i = 0; i < this.mask.length; i++) {
      if (this.mask[i]) out.push([this.x0 + (i % this.width), this.y0 + Math.floor(i / this.width)])
    }
    return out
  }
}

/** Bounding box of rings of lattice points. */
export function ringBounds(rings: readonly (readonly Vec2[])[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ring of rings) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  return { minX, minY, maxX, maxY }
}

/**
 * The cells of a polyomino with holes, given by its boundary rings (outer and holes, any orientation): a
 * cell belongs to it if its centre lies inside an odd number of rings (scan lines through the centres).
 */
export function rasterize(rings: readonly (readonly Vec2[])[]): CellGrid {
  const b = ringBounds(rings)
  const grid = new CellGrid(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY)
  for (let y = b.minY; y < b.maxY; y++) {
    const yc = y + 0.5
    const crossings: number[] = []
    for (const ring of rings) {
      for (let i = 0, n = ring.length; i < n; i++) {
        const [x1, y1] = ring[i]!
        const [x2, y2] = ring[(i + 1) % n]!
        // Polyomino edges are axis-parallel: only vertical edges cross a row through cell centres.
        if (x1 === x2 && y1 <= yc !== y2 <= yc) crossings.push(x1)
      }
    }
    crossings.sort((a, b) => a - b)
    for (let c = 0; c + 1 < crossings.length; c += 2) {
      for (let x = crossings[c]!; x < crossings[c + 1]!; x++) grid.mask[grid.index(x, y)] = 1
    }
  }
  return grid
}

/** The cutter's cells relative to its reference point (`cutter_center`): the footprint at p is p + offsets. */
export function cutterOffsets(cutter: readonly Vec2[], center: Vec2): Vec2[] {
  return rasterize([cutter])
    .cells()
    .map(([x, y]) => [x - center[0], y - center[1]] as const)
}

/** What a hole in the lawn is drawn as. */
export type HoleKind = 'tree' | 'bed' | 'pond'

/**
 * The art of a hole by its shape (the same rule as `scripts/lawns/make_instances.py`): a 1 × 1 or 2 × 2
 * square is a tree, a rectangle 1 or 2 cells wide and at least 3 long a flower bed, anything else a pond.
 */
export function holeKind(hole: readonly Vec2[]): HoleKind {
  const cells = rasterize([hole])
  const w = cells.width
  const h = cells.height
  if (cells.count === w * h) {
    if (w === h && w <= 2) return 'tree'
    if (Math.min(w, h) <= 2 && Math.max(w, h) >= 3) return 'bed'
  }
  return 'pond'
}
