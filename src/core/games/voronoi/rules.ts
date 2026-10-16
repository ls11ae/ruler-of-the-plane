import { Delaunay } from 'd3-delaunay'
import type { Vec2 } from '../../geometry/types'
import { insideFrame, isOnLand, LAND_POINTS, landAreaIn, type GameMap } from './map'

/** Blue (0) starts; orange (1) is the friend or the computer. */
export type Player = 0 | 1

export const other = (p: Player): Player => (p === 0 ? 1 : 0)

export interface Castle {
  at: Vec2
  owner: Player
}

/** Bonus points for the owner of the cell that contains a city or a gold mine. */
export const CITY_BONUS = 5
export const MINE_BONUS = 10

/** Castles per player, the two game lengths. */
export const CASTLE_COUNTS = [5, 10] as const
export type CastleCount = (typeof CASTLE_COUNTS)[number]

/**
 * The smallest distance between two castles: castles stand apart, so a map never fills up and a
 * castle cannot sit right on top of an enemy's. It shrinks with the number of castles and grows with
 * the land, so every map and game length leaves about the same room: 0.55 × √(land per castle).
 */
export function minDistance(map: GameMap, castlesPerPlayer: number): number {
  return 0.55 * Math.sqrt(map.landArea / (2 * castlesPerPlayer))
}

export type PlacementProblem = 'water' | 'tooClose'

/** Why a castle may not stand at p (null if it may): castles only on land and apart from all others. */
export function placementProblem(
  map: GameMap,
  castles: readonly Castle[],
  p: Vec2,
  minDist: number,
): PlacementProblem | null {
  if (!insideFrame(map, p) || !isOnLand(map, p)) return 'water'
  const d2 = minDist * minDist
  for (const c of castles) {
    const dx = c.at[0] - p[0]
    const dy = c.at[1] - p[1]
    if (dx * dx + dy * dy < d2) return 'tooClose'
  }
  return null
}

/** Whose turn it is after these castles: players alternate, `first` starts. */
export function playerToMove(castles: readonly Castle[], first: Player): Player {
  return castles.length % 2 === 0 ? first : other(first)
}

/** The Voronoi cells of the castles, clipped to the map sheet (rings, closed as d3-delaunay returns them). */
export function cells(map: GameMap, castles: readonly Castle[]): Vec2[][] {
  if (!castles.length) return []
  const f = map.frame
  const voronoi = Delaunay.from(castles.map((c) => [c.at[0], c.at[1]])).voronoi([
    f.minX,
    f.minY,
    f.maxX,
    f.maxY,
  ])
  return castles.map((_, i) => (voronoi.cellPolygon(i) ?? []) as Vec2[])
}

/** Index of the castle whose cell contains p (the nearest castle; the first one on a tie). */
export function nearestCastle(castles: readonly Castle[], p: Vec2): number {
  let best = -1
  let bestD = Infinity
  castles.forEach((c, i) => {
    const d = (c.at[0] - p[0]) ** 2 + (c.at[1] - p[1]) ** 2
    if (d < bestD) {
      best = i
      bestD = d
    }
  })
  return best
}

export interface Score {
  /** Land points: share of the land in percent (not rounded). */
  land: number
  cities: number
  mines: number
  /** City and mine bonus points. */
  bonus: number
  /** Land points rounded to whole points plus the bonus: what the game shows and compares. */
  total: number
}

/** The exact score of both players (cells clipped to the land with Clipper2) and each castle's land. */
export function exactScores(
  map: GameMap,
  castles: readonly Castle[],
): { scores: [Score, Score]; castleLand: number[] } {
  const castleLand = cells(map, castles).map((cell) =>
    cell.length ? (landAreaIn(map, cell) / map.landArea) * LAND_POINTS : 0,
  )
  const land: [number, number] = [0, 0]
  castles.forEach((c, i) => (land[c.owner] += castleLand[i]!))
  return { scores: [score(map, castles, 0, land[0]), score(map, castles, 1, land[1])], castleLand }
}

/** A player's score for the given land points: bonuses from the cities and mines in their cells. */
export function score(map: GameMap, castles: readonly Castle[], player: Player, land: number): Score {
  const owns = (p: Vec2) => {
    const i = nearestCastle(castles, p)
    return i >= 0 && castles[i]!.owner === player
  }
  const cities = map.level.cities.filter(owns).length
  const mines = map.level.mines.filter(owns).length
  const bonus = cities * CITY_BONUS + mines * MINE_BONUS
  return { land, cities, mines, bonus, total: Math.round(land) + bonus }
}

/** The winner by the shown totals, or null on a draw. */
export function winner(scores: readonly [Score, Score]): Player | null {
  const [a, b] = scores
  return a.total === b.total ? null : a.total > b.total ? 0 : 1
}
