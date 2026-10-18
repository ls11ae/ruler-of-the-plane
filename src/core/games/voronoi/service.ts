import type { VoronoiLevel } from '../../levels/schema'
import { mulberry32 } from '../../random'
import { candidatePositions, chooseMove, swingGrid, type AiContext, type MoveRequest } from './ai'
import { prepareMap } from './map'
import { coarseRaster, makeRaster } from './raster'
import { minDistance, type Castle, type Player } from './rules'

/** Messages to the computer player (run in a Web Worker, `src/workers/voronoi-ai.ts`). */
export type AiRequest =
  | { kind: 'move'; id: number; level: VoronoiLevel; move: MoveRequest; seed: number }
  | {
      kind: 'heat'
      id: number
      level: VoronoiLevel
      castles: readonly Castle[]
      player: Player
      minDist: number
      spacing: number
    }
  /** Prepares a map and runs one move to warm up the engine, so the first real move is quick. */
  | { kind: 'warm'; id: number; level: VoronoiLevel }

export type HeatGrid = ReturnType<typeof swingGrid>

export type AiResponse =
  | { kind: 'move'; id: number; at: readonly [number, number] | null; ms: number }
  | { kind: 'heat'; id: number; grid: HeatGrid; ms: number }
  | { kind: 'warm'; id: number; ms: number }

const contexts = new Map<string, AiContext>()

/** The map and its raster, prepared once per map. */
function context(level: VoronoiLevel): AiContext {
  let ctx = contexts.get(level.id)
  if (!ctx) {
    const map = prepareMap(level)
    ctx = { map, raster: makeRaster(map), coarse: coarseRaster(map) }
    contexts.set(level.id, ctx)
  }
  return ctx
}

/** Answers one request (in the worker, or directly where no worker is available). */
export function serveAi(request: AiRequest): AiResponse {
  const start = Date.now()
  const ctx = context(request.level)
  if (request.kind === 'move') {
    const at = chooseMove(ctx, request.move, mulberry32(request.seed))
    return { kind: 'move', id: request.id, at, ms: Date.now() - start }
  }
  if (request.kind === 'warm') {
    const minDist = minDistance(ctx.map, 10)
    const at = candidatePositions(ctx, [], minDist, mulberry32(1))[0]
    const castles = at ? [{ at, owner: 0 as const }] : []
    chooseMove(ctx, { castles, player: 1, minDist, opponentMovesLeft: true, level: 'hard' }, mulberry32(1))
    return { kind: 'warm', id: request.id, ms: Date.now() - start }
  }
  const grid = swingGrid(ctx, request.castles, request.player, request.minDist, request.spacing)
  return { kind: 'heat', id: request.id, grid, ms: Date.now() - start }
}
