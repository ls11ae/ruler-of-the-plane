import { describe, expect, it } from 'vitest'
import { VORONOI_MAPS } from './maps.fixture'
import { minDistance } from './rules'
import { serveAi } from './service'
import { prepareMap } from './map'

describe("the computer's worker", () => {
  it('warms up on a map, then answers a move there', () => {
    const level = VORONOI_MAPS[1]!
    expect(serveAi({ kind: 'warm', id: 1, level })).toMatchObject({ kind: 'warm', id: 1 })
    const minDist = minDistance(prepareMap(level), 10)
    const answer = serveAi({
      kind: 'move',
      id: 2,
      level,
      move: { castles: [], player: 1, minDist, opponentMovesLeft: true, level: 'hard' },
      seed: 1,
    })
    expect(answer).toMatchObject({ kind: 'move', id: 2 })
    expect(answer.kind === 'move' && answer.at).toBeTruthy()
  })
})
