import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../geometry/types'
import { mulberry32 } from '../../random'
import { distanceToCoast, isOnLand, LAND_POINTS, landClearance, prepareMap, type GameMap } from './map'
import { VORONOI_MAPS } from './maps.fixture'
import { hasRoom, makeRaster, Territory } from './raster'
import {
  CITY_BONUS,
  COAST_MARGIN,
  cells,
  exactScores,
  minDistance,
  MINE_BONUS,
  nearestCastle,
  placementProblem,
  playerToMove,
  TOWN_MARGIN,
  winner,
  type Castle,
  type Player,
} from './rules'

function randomLandPoint(map: GameMap, rng: () => number): Vec2 {
  const f = map.frame
  for (;;) {
    const p: Vec2 = [f.minX + rng() * (f.maxX - f.minX), f.minY + rng() * (f.maxY - f.minY)]
    if (isOnLand(map, p)) return p
  }
}

/** Random valid castles, alternating owners. */
function randomCastles(map: GameMap, count: number, seed: number, minDist = minDistance(map, 10)): Castle[] {
  const rng = mulberry32(seed)
  const castles: Castle[] = []
  while (castles.length < count) {
    const at = randomLandPoint(map, rng)
    if (placementProblem(map, castles, at, minDist) === null) {
      castles.push({ at, owner: (castles.length % 2) as Player })
    }
  }
  return castles
}

describe.each(VORONOI_MAPS)('$name', (level) => {
  const map = prepareMap(level)

  it('has land worth between a third and all of the sheet', () => {
    const sheet = (map.frame.maxX - map.frame.minX) * (map.frame.maxY - map.frame.minY)
    expect(map.landArea).toBeGreaterThan(sheet / 3)
    expect(map.landArea).toBeLessThanOrEqual(sheet)
  })

  it('measures the clearance from the coast as the exact land test and the distance do', () => {
    const rng = mulberry32(level.number)
    const f = map.frame
    for (let i = 0; i < 400; i++) {
      const p: Vec2 = [f.minX + rng() * (f.maxX - f.minX), f.minY + rng() * (f.maxY - f.minY)]
      const clearance = landClearance(map, p)
      expect(clearance >= 0, `${p.join(', ')}`).toBe(isOnLand(map, p))
      if (clearance >= 0) expect(clearance).toBeCloseTo(distanceToCoast(map, p), 9)
    }
  })

  it('puts cities and mines on land, away from the coast', () => {
    for (const p of [...level.cities, ...level.mines]) {
      expect(isOnLand(map, p)).toBe(true)
      for (const [dx, dy] of [
        [0.3, 0],
        [-0.3, 0],
        [0, 0.3],
        [0, -0.3],
      ] as const) {
        expect(isOnLand(map, [p[0] + dx, p[1] + dy])).toBe(true)
      }
    }
  })

  it('gives all land to the castles: cell land adds up to 100 points', () => {
    for (const seed of [1, 2, 3]) {
      const castles = randomCastles(map, 2 + 6 * seed, seed)
      const { scores, castleLand } = exactScores(map, castles)
      expect(castleLand.reduce((a, b) => a + b, 0)).toBeCloseTo(LAND_POINTS, 4)
      expect(scores[0].land + scores[1].land).toBeCloseTo(LAND_POINTS, 4)
      const bonus = level.cities.length * CITY_BONUS + level.mines.length * MINE_BONUS
      expect(scores[0].bonus + scores[1].bonus).toBe(bonus)
    }
  })

  it('cells partition the sheet and contain their castles', () => {
    const castles = randomCastles(map, 12, 7)
    const ringArea = (r: readonly Vec2[]) =>
      Math.abs(
        r.reduce((s, [x1, y1], i) => s + x1 * r[(i + 1) % r.length]![1] - r[(i + 1) % r.length]![0] * y1, 0),
      ) / 2
    const sheet = (map.frame.maxX - map.frame.minX) * (map.frame.maxY - map.frame.minY)
    expect(cells(map, castles).reduce((s, c) => s + ringArea(c), 0)).toBeCloseTo(sheet, 6)
  })

  it('counts land on the raster within 1 % of the land of the exact clipping', () => {
    const raster = makeRaster(map)
    for (const seed of [11, 12, 13, 14]) {
      const castles = randomCastles(map, 4 + 4 * (seed - 10), seed)
      const exact = exactScores(map, castles).scores
      const territory = new Territory(raster, castles)
      for (const player of [0, 1] as const) {
        expect(Math.abs(territory.landPoints(player) - exact[player].land)).toBeLessThan(1)
        expect(territory.bonusPoints(player)).toBe(exact[player].bonus)
      }
    }
  })

  it('predicts the gain of a castle as the raster after adding it', () => {
    const raster = makeRaster(map)
    const castles = randomCastles(map, 9, 21)
    const territory = new Territory(raster, castles.slice(0, 8))
    const next = castles[8]!
    const gain = territory.gain(next.at, next.owner)
    const after = new Territory(raster, castles)
    const own = (t: Territory) => t.landPoints(next.owner) + t.bonusPoints(next.owner)
    const theirs = (t: Territory) =>
      t.landPoints(next.owner === 0 ? 1 : 0) + t.bonusPoints(next.owner === 0 ? 1 : 0)
    expect(own(after) - own(territory)).toBeCloseTo(gain.land + gain.bonus, 9)
    expect(own(after) - theirs(after) - (own(territory) - theirs(territory))).toBeCloseTo(gain.swing, 9)
  })
})

describe('rules', () => {
  const map = prepareMap(VORONOI_MAPS[0]!)

  it('allows castles only on land and apart from the others', () => {
    const land: Vec2 = [0.5, -1.5]
    expect(placementProblem(map, [], land, 1)).toBeNull()
    expect(placementProblem(map, [], [map.frame.minX + 0.01, map.frame.minY + 0.01], 1)).toBe('water')
    expect(placementProblem(map, [], [100, 0], 1)).toBe('water')
    const castle: Castle = { at: land, owner: 0 }
    expect(placementProblem(map, [castle], [land[0] + 0.5, land[1]], 1)).toBe('tooClose')
    expect(placementProblem(map, [castle], [land[0] + 1, land[1]], 1)).toBeNull()
  })

  it('keeps castles off the shore and off cities and mines', () => {
    const city = map.level.cities[0]!
    expect(placementProblem(map, [], city, 1)).toBe('town')
    expect(placementProblem(map, [], [city[0], city[1] + TOWN_MARGIN + 0.01], 1)).toBeNull()
    // Walk from inland towards the sea until the castle is refused: that happens before the water.
    let p: Vec2 = [0.5, -1.5]
    while (placementProblem(map, [], p, 1) === null) p = [p[0], p[1] - 0.01]
    expect(isOnLand(map, p)).toBe(true)
    expect(distanceToCoast(map, p)).toBeLessThan(COAST_MARGIN)
    expect(distanceToCoast(map, p)).toBeGreaterThan(COAST_MARGIN - 0.02)
  })

  it('lets blue start and the players alternate', () => {
    const c = (owner: Player): Castle => ({ at: [0, 0], owner })
    expect(playerToMove([], 0)).toBe(0)
    expect(playerToMove([c(0)], 0)).toBe(1)
    expect(playerToMove([c(0), c(1)], 0)).toBe(0)
    expect(playerToMove([c(1)], 1)).toBe(0)
  })

  it('gives a single castle the whole land and every bonus', () => {
    const { scores } = exactScores(map, [{ at: map.level.cities[0]!, owner: 1 }])
    expect(scores[1].land).toBeCloseTo(100, 4)
    expect(scores[1].cities).toBe(map.level.cities.length)
    expect(scores[0].total).toBe(0)
    expect(winner(scores)).toBe(1)
  })

  it('finds the nearest castle and calls equal totals a draw', () => {
    const castles: Castle[] = [
      { at: [0, 0], owner: 0 },
      { at: [2, 0], owner: 1 },
    ]
    expect(nearestCastle(castles, [0.9, 3])).toBe(0)
    expect(nearestCastle(castles, [1.1, -3])).toBe(1)
    const s = { land: 50, cities: 0, mines: 0, bonus: 0, total: 50 }
    expect(winner([s, { ...s, land: 49.6 }])).toBeNull()
    expect(winner([s, { ...s, total: 51 }])).toBe(1)
  })

  it('keeps enough room for 20 castles on every map', () => {
    for (const level of VORONOI_MAPS) {
      const m = prepareMap(level)
      const castles = randomCastles(m, 20, 5, minDistance(m, 10))
      expect(castles).toHaveLength(20)
    }
  })
})

describe('room for castles', () => {
  it('is left on an empty map and gone when the minimum distance spans the sheet', () => {
    const map = prepareMap(VORONOI_MAPS[0]!)
    const raster = makeRaster(map)
    const castles: Castle[] = [{ at: [0, 0], owner: 0 }]
    expect(hasRoom(map, raster, [], 1)).toBe(true)
    expect(hasRoom(map, raster, castles, 1)).toBe(true)
    expect(hasRoom(map, raster, castles, 50)).toBe(false)
  })
})
