import { locate, pointAt, type Path } from './path'

/**
 * How hard a walk is, measured on a fine raster of the free-space diagram: the person and the dog at
 * positions 0, h, 2h, … along their paths (the same step for both, so the raster's moves are the
 * game's: the person walks, the dog walks, or both walk at the same speed), and the leash at every pair
 * of positions (straight in the park, around the trees in the woods).
 */
export interface LeashRaster {
  /** Person's positions in metres. */
  s: number[]
  /** Dog's positions in metres. */
  t: number[]
  /** Leash at (s[i], t[j]), index i · t.length + j. */
  leash: Float32Array
}

/** Positions 0, step, 2·step, … and the end. */
export function samplePositions(length: number, step: number): number[] {
  const n = Math.max(1, Math.ceil(length / step - 1e-9))
  return Array.from({ length: n + 1 }, (_, i) => Math.min(i * step, length))
}

/** The straight leash of the park at every pair of positions. */
export function parkRaster(person: Path, dog: Path, step: number): LeashRaster {
  const s = samplePositions(person.length, step)
  const t = samplePositions(dog.length, step)
  const a = s.map((x) => pointAt(person, x))
  const b = t.map((x) => pointAt(dog, x))
  const m = t.length
  const leash = new Float32Array(s.length * m)
  for (let i = 0; i < s.length; i++) {
    const [ax, ay] = a[i]!
    for (let j = 0; j < m; j++) leash[i * m + j] = Math.hypot(b[j]![0] - ax, b[j]![1] - ay)
  }
  return { s, t, leash }
}

export interface FreeSpaceReport {
  /** Whether the castle can be reached with this leash (on the raster). */
  ok: boolean
  /** Positions reachable from the start, as a share of all positions. */
  reachable: number
  /** Reachable positions from which the castle can no longer be reached, as a share of the reachable. */
  deadShare: number
  /** The separate dead ends (at least `minArea` m² of the diagram), largest first, in m². */
  deadEnds: number[]
  /** Cells of the diagram (pairs of segments) the reachable free space enters. */
  cells: number
  /**
   * Cells with any free space at all (reachable or not): the complexity of the free-space diagram,
   * close to all cells when the two paths wind around each other, few when they run side by side.
   */
  freeCells: number
  /** All cells: segments of the person's path × segments of the dog's trail. */
  allCells: number
  /**
   * How maze-like the reachable free space is: along each line where person and dog have walked the
   * same distance together (s + t constant), the number of separate stretches of reachable positions,
   * averaged over those lines (1 for a single corridor).
   */
  branches: number
}

/**
 * The free space at leash length `limit`: which positions can be reached from the start with the
 * game's moves, which of those still lead to the castle, and the dead ends in between (connected
 * groups of positions from which the castle cannot be reached any more; smaller groups than `minArea`
 * square metres of the diagram are raster noise at the edge of the free space and not counted).
 */
export function freeSpaceReport(
  raster: LeashRaster,
  limit: number,
  person: Path,
  dog: Path,
  minArea = 0.25,
): FreeSpaceReport {
  const { s, t, leash } = raster
  const n = s.length
  const m = t.length
  const free = (k: number) => leash[k]! <= limit
  const reach = new Uint8Array(n * m)
  const finish = new Uint8Array(n * m)
  if (free(0)) reach[0] = 1
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const k = i * m + j
      if (reach[k] || !free(k)) continue
      if ((i > 0 && reach[k - m]) || (j > 0 && reach[k - 1]) || (i > 0 && j > 0 && reach[k - m - 1]))
        reach[k] = 1
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const k = i * m + j
      if (!free(k)) continue
      if (
        (i === n - 1 && j === m - 1) ||
        (i < n - 1 && finish[k + m]) ||
        (j < m - 1 && finish[k + 1]) ||
        (i < n - 1 && j < m - 1 && finish[k + m + 1])
      )
        finish[k] = 1
    }
  }
  // Dead ends: reachable, not finishing; grouped by 8-neighbourhood.
  let reachable = 0
  let dead = 0
  const seen = new Uint8Array(n * m)
  const deadEnds: number[] = []
  const cellArea = (raster.s[1]! - raster.s[0]!) * (raster.t[1]! - raster.t[0]!)
  const stack: number[] = []
  for (let k = 0; k < n * m; k++) {
    if (!reach[k]) continue
    reachable++
    if (finish[k]) continue
    dead++
    if (seen[k]) continue
    let size = 0
    seen[k] = 1
    stack.push(k)
    while (stack.length > 0) {
      const c = stack.pop()!
      size++
      const ci = Math.floor(c / m)
      const cj = c - ci * m
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const ni = ci + di
          const nj = cj + dj
          if (ni < 0 || nj < 0 || ni >= n || nj >= m) continue
          const nk = ni * m + nj
          if (reach[nk] && !finish[nk] && !seen[nk]) {
            seen[nk] = 1
            stack.push(nk)
          }
        }
      }
    }
    const area = size * cellArea
    if (area >= minArea) deadEnds.push(area)
  }
  deadEnds.sort((a, b) => b - a)
  // Cells of the diagram entered by the reachable free space.
  const segP = s.map((x) => locate(person, x).segment)
  const segQ = t.map((x) => locate(dog, x).segment)
  const q = dog.points.length - 1
  const entered = new Set<number>()
  const freeSet = new Set<number>()
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const k = i * m + j
      if (reach[k]) entered.add(segP[i]! * q + segQ[j]!)
      if (free(k)) freeSet.add(segP[i]! * q + segQ[j]!)
    }
  }
  let lines = 0
  let runs = 0
  for (let d = 0; d <= n + m - 2; d++) {
    let count = 0
    let inside = false
    for (let i = Math.max(0, d - m + 1); i <= Math.min(n - 1, d); i++) {
      const r = reach[i * m + (d - i)] === 1
      if (r && !inside) count++
      inside = r
    }
    if (count > 0) {
      lines++
      runs += count
    }
  }
  return {
    ok: finish[0] === 1 && reach[0] === 1,
    reachable: reachable / (n * m),
    deadShare: reachable > 0 ? dead / reachable : 0,
    deadEnds,
    cells: entered.size,
    freeCells: freeSet.size,
    allCells: (person.points.length - 1) * q,
    branches: lines > 0 ? runs / lines : 0,
  }
}
