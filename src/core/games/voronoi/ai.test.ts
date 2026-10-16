import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../random'
import { candidatePositions, chooseMove, swingGrid, type AiContext, type AiLevel } from './ai'
import { prepareMap } from './map'
import { VORONOI_MAPS } from './maps.fixture'
import { makeRaster, Territory } from './raster'
import { minDistance, placementProblem, type Castle } from './rules'
import { playComputerGame } from './simulate'

const contexts: AiContext[] = VORONOI_MAPS.map((level) => {
  const map = prepareMap(level)
  return { map, raster: makeRaster(map) }
})

describe('computer moves', () => {
  const ctx = contexts[0]!
  const minDist = minDistance(ctx.map, 10)
  const castles = playComputerGame(ctx, ['normal', 'normal'], 10, 3).castles.slice(0, 9)

  it('are valid positions on land, for every level', () => {
    for (const level of ['easy', 'normal', 'hard'] as AiLevel[]) {
      for (const seed of [1, 2, 3]) {
        const at = chooseMove(
          ctx,
          { castles, player: 1, minDist, opponentMovesLeft: true, level },
          mulberry32(seed),
        )
        expect(at).not.toBeNull()
        expect(placementProblem(ctx.map, castles, at!, minDist)).toBeNull()
      }
    }
  })

  it('are reproducible with the same seed', () => {
    const request = { castles, player: 1 as const, minDist, opponentMovesLeft: true, level: 'easy' as const }
    expect(chooseMove(ctx, request, mulberry32(9))).toEqual(chooseMove(ctx, request, mulberry32(9)))
  })

  it('take the best candidate on "Mittel"', () => {
    const rng = mulberry32(4)
    const at = chooseMove(
      ctx,
      { castles, player: 1, minDist, opponentMovesLeft: true, level: 'normal' },
      rng,
    )!
    const territory = new Territory(ctx.raster, castles)
    const best = Math.max(
      ...candidatePositions(ctx, castles, minDist, mulberry32(4)).map((p) => territory.gain(p, 1).swing),
    )
    expect(territory.gain(at, 1).swing).toBeCloseTo(best, 9)
  })

  it('return null when no position is left', () => {
    const crowd: Castle[] = [{ at: [0, 0], owner: 0 }]
    expect(
      chooseMove(
        ctx,
        { castles: crowd, player: 1, minDist: 100, opponentMovesLeft: true, level: 'hard' },
        mulberry32(1),
      ),
    ).toBeNull()
  })

  it('take less than 200 ms on "Schwer" (acceptance: on a booth laptop)', () => {
    for (const c of contexts) {
      const game = playComputerGame(c, ['normal', 'normal'], 10, 5).castles
      const times = [0, 4, 8, 12].map((k) => {
        const t = performance.now()
        chooseMove(
          c,
          {
            castles: game.slice(0, k),
            player: 0,
            minDist: minDistance(c.map, 10),
            opponentMovesLeft: true,
            level: 'hard',
          },
          mulberry32(k),
        )
        return performance.now() - t
      })
      expect(times.sort((a, b) => a - b)[2]).toBeLessThan(200)
    }
  })
})

describe('computer against computer', () => {
  it('"Schwer" beats "Leicht" in at least 70 % of the games (acceptance)', () => {
    let won = 0
    let games = 0
    contexts.forEach((ctx, m) => {
      for (let s = 0; s < 4; s++) {
        const hard = (s % 2) as 0 | 1
        const levels: [AiLevel, AiLevel] = hard === 0 ? ['hard', 'easy'] : ['easy', 'hard']
        const { scores } = playComputerGame(ctx, levels, 5, 1000 * m + s, ((s >> 1) % 2) as 0 | 1)
        games++
        if (scores[hard].total > scores[hard === 0 ? 1 : 0].total) won++
      }
    })
    expect(won / games).toBeGreaterThanOrEqual(0.7)
  }, 60_000)

  it('builds every castle in a full game', () => {
    const { castles, scores } = playComputerGame(contexts[1]!, ['easy', 'hard'], 10, 77)
    expect(castles).toHaveLength(20)
    expect(scores[0].land + scores[1].land).toBeCloseTo(100, 4)
  })
})

describe('heat map', () => {
  it('rates valid grid points and leaves water and crowded points out', () => {
    const ctx = contexts[2]!
    const castles: Castle[] = [{ at: ctx.map.level.cities[0]!, owner: 0 }]
    const grid = swingGrid(ctx, castles, 1, minDistance(ctx.map, 5), 0.5)
    expect(grid.values).toHaveLength(grid.columns * grid.rows)
    const valid = [...grid.values].filter((v) => !Number.isNaN(v))
    expect(valid.length).toBeGreaterThan(grid.values.length / 3)
    expect(valid.length).toBeLessThan(grid.values.length)
    expect(Math.min(...valid)).toBeGreaterThan(0)
  })
})
