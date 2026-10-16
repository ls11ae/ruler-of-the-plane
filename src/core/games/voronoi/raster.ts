import type { Vec2 } from '../../geometry/types'
import { LAND_POINTS, type GameMap } from './map'
import { CITY_BONUS, MINE_BONUS, type Castle, type Player } from './rules'

/**
 * The land as a raster of sample points (centres of a square grid that lie on land), for the computer's
 * fast estimates: the land a castle would win is the number of samples closer to it than to every other
 * castle. Samples are stored row by row, sorted by x within a row, so a query can skip rows and columns
 * that are too far away.
 */
export interface LandRaster {
  step: number
  xs: Float64Array
  ys: Float64Array
  /** Samples of row r are `rowStart[r]` to `rowStart[r + 1] - 1`, all with y = `rowY[r]`. */
  rowStart: Int32Array
  rowY: Float64Array
  /** Land points per sample (all samples together are worth {@link LAND_POINTS}). */
  weight: number
  /** Cities and gold mines with their bonus points. */
  bonuses: { at: Vec2; points: number }[]
}

/** Default spacing of the samples in map units: about 10,000 samples on a 16 × 10 sheet full of land. */
export const RASTER_STEP = 0.125

/**
 * Samples the land on a grid with the given spacing by scan lines: per row, the crossings of all ring
 * edges with the row's line, counted with their direction (non-zero rule, rings may have any number of
 * holes and parts).
 */
export function makeRaster(map: GameMap, step = RASTER_STEP): LandRaster {
  const f = map.frame
  const xs: number[] = []
  const ys: number[] = []
  const rowStart: number[] = [0]
  const rowY: number[] = []
  const rings = map.level.land
  for (let y = f.minY + step / 2; y < f.maxY; y += step) {
    const crossings: { x: number; dir: number }[] = []
    for (const ring of rings) {
      for (let i = 0, n = ring.length; i < n; i++) {
        const [x1, y1] = ring[i]!
        const [x2, y2] = ring[(i + 1) % n]!
        if (y1 <= y !== y2 <= y) {
          crossings.push({ x: x1 + ((y - y1) / (y2 - y1)) * (x2 - x1), dir: y2 > y1 ? 1 : -1 })
        }
      }
    }
    crossings.sort((a, b) => a.x - b.x)
    let winding = 0
    let c = 0
    for (let x = f.minX + step / 2; x < f.maxX; x += step) {
      while (c < crossings.length && crossings[c]!.x <= x) winding += crossings[c++]!.dir
      if (winding !== 0) {
        xs.push(x)
        ys.push(y)
      }
    }
    rowY.push(y)
    rowStart.push(xs.length)
  }
  const bonuses = [
    ...map.level.cities.map((at) => ({ at, points: CITY_BONUS })),
    ...map.level.mines.map((at) => ({ at, points: MINE_BONUS })),
  ]
  return {
    step,
    xs: Float64Array.from(xs),
    ys: Float64Array.from(ys),
    rowStart: Int32Array.from(rowStart),
    rowY: Float64Array.from(rowY),
    weight: LAND_POINTS / Math.max(1, xs.length),
    bonuses,
  }
}

/** First index in [lo, hi) whose x is at least `x` (xs sorted ascending in that range). */
function lowerBound(xs: Float64Array, lo: number, hi: number, x: number): number {
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (xs[mid]! < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Who owns which sample: the squared distance of every sample (and every bonus) to its nearest castle and
 * that castle's owner. `swing` answers "how much better would a castle at p make me" quickly.
 */
export class Territory {
  readonly dist2: Float64Array
  readonly owner: Int8Array
  /** Per row: the largest squared distance of a sample to its castle (a new castle farther away changes nothing). */
  readonly rowMax: Float64Array
  readonly bonusDist2: Float64Array
  readonly bonusOwner: Int8Array

  constructor(
    readonly raster: LandRaster,
    castles: readonly Castle[] = [],
    copyFrom?: Territory,
  ) {
    const n = raster.xs.length
    const rows = raster.rowY.length
    if (copyFrom) {
      this.dist2 = copyFrom.dist2.slice()
      this.owner = copyFrom.owner.slice()
      this.rowMax = copyFrom.rowMax.slice()
      this.bonusDist2 = copyFrom.bonusDist2.slice()
      this.bonusOwner = copyFrom.bonusOwner.slice()
    } else {
      this.dist2 = new Float64Array(n).fill(Infinity)
      this.owner = new Int8Array(n).fill(-1)
      this.rowMax = new Float64Array(rows).fill(Infinity)
      this.bonusDist2 = new Float64Array(raster.bonuses.length).fill(Infinity)
      this.bonusOwner = new Int8Array(raster.bonuses.length).fill(-1)
    }
    for (const c of castles) this.add(c)
  }

  clone(): Territory {
    return new Territory(this.raster, [], this)
  }

  /** Places a castle: samples closer to it than to their castle change hands. */
  add({ at: [px, py], owner }: Castle): void {
    const { xs, rowStart, rowY } = this.raster
    for (let r = 0; r < rowY.length; r++) {
      const dy = rowY[r]! - py
      const dy2 = dy * dy
      if (dy2 >= this.rowMax[r]!) continue
      let max = 0
      for (let i = rowStart[r]!, end = rowStart[r + 1]!; i < end; i++) {
        const dx = xs[i]! - px
        const d = dx * dx + dy2
        if (d < this.dist2[i]!) {
          this.dist2[i] = d
          this.owner[i] = owner
        }
        if (this.dist2[i]! > max) max = this.dist2[i]!
      }
      this.rowMax[r] = max
    }
    this.raster.bonuses.forEach(({ at }, b) => {
      const d = (at[0] - px) ** 2 + (at[1] - py) ** 2
      if (d < this.bonusDist2[b]!) {
        this.bonusDist2[b] = d
        this.bonusOwner[b] = owner
      }
    })
  }

  /** Land points of a player (raster estimate). */
  landPoints(player: Player): number {
    let count = 0
    for (let i = 0; i < this.owner.length; i++) if (this.owner[i] === player) count++
    return count * this.raster.weight
  }

  bonusPoints(player: Player): number {
    let points = 0
    this.raster.bonuses.forEach((b, i) => {
      if (this.bonusOwner[i] === player) points += b.points
    })
    return points
  }

  /**
   * What a castle of `player` at p would win: land points (from the opponent and from nobody) and bonus
   * points, and the swing, the change of (own points − opponent's points).
   */
  gain([px, py]: Vec2, player: Player): { land: number; fromOpponent: number; bonus: number; swing: number } {
    const { xs, rowStart, rowY, weight } = this.raster
    let free = 0
    let taken = 0
    for (let r = 0; r < rowY.length; r++) {
      const dy = rowY[r]! - py
      const dy2 = dy * dy
      const max = this.rowMax[r]!
      if (dy2 >= max) continue
      let lo = rowStart[r]!
      let hi = rowStart[r + 1]!
      if (max !== Infinity) {
        const reach = Math.sqrt(max - dy2)
        lo = lowerBound(xs, lo, hi, px - reach)
        hi = lowerBound(xs, lo, hi, px + reach)
      }
      for (let i = lo; i < hi; i++) {
        const dx = xs[i]! - px
        if (dx * dx + dy2 < this.dist2[i]!) {
          const o = this.owner[i]!
          if (o === -1) free++
          else if (o !== player) taken++
        }
      }
    }
    let bonus = 0
    let bonusSwing = 0
    this.raster.bonuses.forEach(({ at, points }, b) => {
      const d = (at[0] - px) ** 2 + (at[1] - py) ** 2
      const o = this.bonusOwner[b]!
      if (d < this.bonusDist2[b]! && o !== player) {
        bonus += points
        bonusSwing += o === -1 ? points : 2 * points
      }
    })
    return {
      land: (free + taken) * weight,
      fromOpponent: taken * weight,
      bonus,
      swing: (free + 2 * taken) * weight + bonusSwing,
    }
  }
}
