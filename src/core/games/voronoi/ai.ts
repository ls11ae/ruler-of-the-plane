import type { Vec2 } from '../../geometry/types'
import { randomInt, type Rng } from '../../random'
import { type GameMap } from './map'
import { Territory, type LandRaster } from './raster'
import { other, placementProblem, TOWN_MARGIN, type Castle, type Player } from './rules'

/** The computer's strength: Leicht, Mittel, Schwer (the staff's difficulty setting is the default). */
export type AiLevel = 'easy' | 'normal' | 'hard'

/** Everything the computer needs about a map, prepared once. */
export interface AiContext {
  map: GameMap
  raster: LandRaster
}

/** About this many jittered grid positions are tried per move, plus positions next to every castle. */
export const GRID_CANDIDATES = 320
/** Positions tried around each castle, just outside the minimum distance. */
const RING_DIRECTIONS = 12
/** "Schwer" looks one move ahead for this many of its best moves. */
const LOOKAHEAD = 8

function ring(at: Vec2, radius: number, directions: number, phase: number): Vec2[] {
  return Array.from({ length: directions }, (_, k) => {
    const a = phase + (2 * Math.PI * k) / directions
    return [at[0] + radius * Math.cos(a), at[1] + radius * Math.sin(a)] as const
  })
}

/**
 * Where the computer considers building: a jittered grid over the sheet (only valid positions on land),
 * positions just outside the minimum distance around every castle (to cut into its cell), and positions
 * right next to the cities and mines.
 */
export function candidatePositions(
  ctx: AiContext,
  castles: readonly Castle[],
  minDist: number,
  rng: Rng,
  gridCount = GRID_CANDIDATES,
): Vec2[] {
  const { map } = ctx
  const f = map.frame
  const spacing = Math.sqrt(map.landArea / gridCount)
  const out: Vec2[] = []
  const tryAdd = (p: Vec2) => {
    if (placementProblem(map, castles, p, minDist) === null) out.push(p)
  }
  for (let y = f.minY + spacing / 2; y < f.maxY; y += spacing) {
    for (let x = f.minX + spacing / 2; x < f.maxX; x += spacing) {
      tryAdd([x + (rng() - 0.5) * 0.8 * spacing, y + (rng() - 0.5) * 0.8 * spacing])
    }
  }
  for (const c of castles) for (const p of ring(c.at, minDist * 1.0001, RING_DIRECTIONS, rng())) tryAdd(p)
  for (const town of [...map.level.cities, ...map.level.mines]) {
    for (const p of ring(town, TOWN_MARGIN * 1.0001, 6, rng())) tryAdd(p)
  }
  return out
}

interface Rated {
  at: Vec2
  swing: number
}

function rate(territory: Territory, positions: readonly Vec2[], player: Player): Rated[] {
  return positions.map((at) => ({ at, swing: territory.gain(at, player).swing }))
}

/** The best swing among the positions; ties broken at random. */
function best(rated: readonly Rated[], rng: Rng): Rated | null {
  let top: Rated[] = []
  let value = -Infinity
  for (const r of rated) {
    if (r.swing > value + 1e-9) {
      value = r.swing
      top = [r]
    } else if (r.swing > value - 1e-9) top.push(r)
  }
  return top.length ? top[randomInt(rng, top.length)]! : null
}

export interface MoveRequest {
  castles: readonly Castle[]
  player: Player
  minDist: number
  /** Whether the opponent still has a castle to build after this move ("Schwer" then looks ahead). */
  opponentMovesLeft: boolean
  level: AiLevel
}

/**
 * The computer's move, or null if no position is left. "Leicht" takes a random one of the good moves
 * (at least half the swing of the best), "Mittel" the move with the largest swing (own points minus the
 * opponent's), "Schwer" the move that is best after the opponent's best answer (one move ahead).
 */
export function chooseMove(ctx: AiContext, request: MoveRequest, rng: Rng): Vec2 | null {
  const { castles, player, minDist, level } = request
  const territory = new Territory(ctx.raster, castles)
  const positions = candidatePositions(ctx, castles, minDist, rng)
  const rated = rate(territory, positions, player)
  if (!rated.length) return null
  if (level === 'easy') {
    const top = Math.max(...rated.map((r) => r.swing))
    const good = rated.filter((r) => r.swing >= 0.5 * top)
    return good[randomInt(rng, good.length)]!.at
  }
  if (level === 'normal' || !request.opponentMovesLeft) return best(rated, rng)!.at

  const shortlist = [...rated].sort((a, b) => b.swing - a.swing).slice(0, LOOKAHEAD)
  const opponent = other(player)
  let choice: Rated | null = null
  let choiceValue = -Infinity
  for (const move of shortlist) {
    const castle: Castle = { at: move.at, owner: player }
    const after = territory.clone()
    after.add(castle)
    const next = [...castles, castle]
    const replies = [
      ...positions.filter((p) => placementProblem(ctx.map, [castle], p, minDist) === null),
      ...ring(move.at, minDist * 1.0001, RING_DIRECTIONS, 0.3).filter(
        (p) => placementProblem(ctx.map, next, p, minDist) === null,
      ),
    ]
    const answer = replies.length ? Math.max(...rate(after, replies, opponent).map((r) => r.swing)) : 0
    const value = move.swing - answer
    if (value > choiceValue + 1e-9) {
      choice = move
      choiceValue = value
    }
  }
  return choice!.at
}

/**
 * The swing of a castle of `player` at every point of a grid with the given spacing (NaN where it may
 * not stand): the computer's view of the next move, shown as a heat map.
 */
export function swingGrid(
  ctx: AiContext,
  castles: readonly Castle[],
  player: Player,
  minDist: number,
  spacing: number,
): { columns: number; rows: number; x0: number; y0: number; spacing: number; values: Float64Array } {
  const f = ctx.map.frame
  const columns = Math.ceil((f.maxX - f.minX) / spacing)
  const rows = Math.ceil((f.maxY - f.minY) / spacing)
  const x0 = f.minX + spacing / 2
  const y0 = f.minY + spacing / 2
  const territory = new Territory(ctx.raster, castles)
  const values = new Float64Array(columns * rows)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const p: Vec2 = [x0 + c * spacing, y0 + r * spacing]
      values[r * columns + c] =
        placementProblem(ctx.map, castles, p, minDist) === null ? territory.gain(p, player).swing : NaN
    }
  }
  return { columns, rows, x0, y0, spacing, values }
}
