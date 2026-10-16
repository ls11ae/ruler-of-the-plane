import type { Vec2 } from '../../geometry/types'
import { CellGrid, cutterOffsets, rasterize } from './grid'
import { positionsOf, tourLength } from './tour'

/** A lawn: its cells and the cutter (pyutils27 instance data, y up). */
export interface Lawn {
  cells: CellGrid
  /** Cells of the cutter relative to its reference point. */
  offsets: Vec2[]
  /** Width of the cutter (cells per row or column, the larger): new cells per unit step at most. */
  cutterWidth: number
}

export function makeLawn(
  outer: readonly Vec2[],
  holes: readonly (readonly Vec2[])[],
  cutter: readonly Vec2[],
  center: Vec2,
): Lawn {
  const offsets = cutterOffsets(cutter, center)
  const xs = offsets.map(([x]) => x)
  const ys = offsets.map(([, y]) => y)
  const width = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 1
  return { cells: rasterize([outer, ...holes]), offsets, cutterWidth: width }
}

/** Which lawn cells are mowed: the union of the cutter's footprints at every position so far. */
export class Mowing {
  readonly mowed: Uint8Array
  private mowedCount = 0

  constructor(readonly lawn: Lawn) {
    this.mowed = new Uint8Array(lawn.cells.mask.length)
  }

  get total(): number {
    return this.lawn.cells.count
  }

  get count(): number {
    return this.mowedCount
  }

  get done(): boolean {
    return this.mowedCount === this.total
  }

  /** Lawn cells a cutter at p would mow that are not mowed yet (without mowing them). */
  fresh([px, py]: Vec2): number {
    let n = 0
    for (const [ox, oy] of this.lawn.offsets) {
      const i = this.lawn.cells.index(px + ox, py + oy)
      if (i >= 0 && this.lawn.cells.mask[i] && !this.mowed[i]) n++
    }
    return n
  }

  /** Mows the footprint at p; returns the number of newly mowed lawn cells. */
  mowAt([px, py]: Vec2): number {
    let n = 0
    for (const [ox, oy] of this.lawn.offsets) {
      const i = this.lawn.cells.index(px + ox, py + oy)
      if (i >= 0 && this.lawn.cells.mask[i] && !this.mowed[i]) {
        this.mowed[i] = 1
        n++
      }
    }
    this.mowedCount += n
    return n
  }

  isMowed(x: number, y: number): boolean {
    const i = this.lawn.cells.index(x, y)
    return i >= 0 && this.mowed[i] === 1
  }

  /** Lawn cells not mowed yet, row by row. */
  uncovered(): Vec2[] {
    return this.lawn.cells.cells().filter(([x, y]) => !this.isMowed(x, y))
  }
}

/**
 * Checks closed tours (corner points per cutter, pyutils27 format) like the pyutils27 verifier: the cells
 * no cutter sweeps, each tour's length and the longest (the objective).
 */
export function checkTours(lawn: Lawn, tours: readonly (readonly Vec2[])[]) {
  const mowing = new Mowing(lawn)
  for (const corners of tours) for (const p of positionsOf(corners)) mowing.mowAt(p)
  const lengths = tours.map(tourLength)
  return { uncovered: mowing.uncovered(), lengths, maxTourLength: Math.max(0, ...lengths) }
}

/**
 * A lower bound for the longest tour of k cutters: every unit step mows at most `cutterWidth` new cells
 * and each cutter's first position at most its size; a closed tour on the grid has even length.
 */
export function lowerBound(lawn: Lawn, k: number): number {
  const steps = Math.ceil((lawn.cells.count - k * lawn.offsets.length) / (k * lawn.cutterWidth))
  const atLeast = Math.max(0, steps)
  return atLeast + (atLeast % 2)
}
