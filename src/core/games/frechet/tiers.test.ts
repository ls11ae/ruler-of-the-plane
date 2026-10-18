import { describe, expect, it } from 'vitest'
import { parkGame, woodsGame } from './assess'
import { frechetDistance } from './frechet'
import { GENERATED } from './generated'
import { HARD_WALK_IDS, MEDIUM_WALK_IDS, WALKS } from './levels'
import { freeSpaceReport, samplePositions } from './hardness'
import { legibleInWoods, pleasant } from './pleasant'
import { advice, makeCourse } from './rules'
import { playCareful, playStrategy, STRATEGIES } from './strategies'
import { WOODS } from './woods/levels'
import { leashAt } from './woods/field'
import { wrapAlong } from './woods/measures'
import { makeWoodsCourse, woodsAdvice } from './woods/rules'
import { HARD_WOODS_IDS, MEDIUM_WOODS_IDS } from './woods/shapes'

/** The generated tiers "Mittel" and "Schwer" keep what `scripts/gassi/generate.ts` selected them for. */
const parkIds: readonly string[] = [...MEDIUM_WALK_IDS, ...HARD_WALK_IDS]
const woodsIds: readonly string[] = [...MEDIUM_WOODS_IDS, ...HARD_WOODS_IDS]

describe('harder tiers', () => {
  it('are stored with the ids of the game, pleasant to look at (in the woods: loops only round posts)', () => {
    expect(GENERATED.park.map((w) => w.id).sort()).toEqual([...parkIds].sort())
    expect(GENERATED.woods.map((w) => w.id).sort()).toEqual([...woodsIds].sort())
    for (const walk of GENERATED.park) expect(pleasant(walk.person, walk.dog), walk.id).toBe(true)
    for (const walk of GENERATED.woods) {
      expect(
        legibleInWoods(
          walk.person,
          walk.dog,
          walk.trunks.map((t) => t.at),
        ),
        walk.id,
      ).toBe(true)
      // Three to eight trees and posts, thick and thin.
      expect(walk.trunks.length, walk.id).toBeGreaterThanOrEqual(3)
      expect(walk.trunks.length, walk.id).toBeLessThanOrEqual(8)
      expect(walk.trunks.some((t) => t.radius < 0.2)).toBe(true)
    }
    // Three of the hard walks in the woods start with a free start leash (one of them the castle round).
    expect(GENERATED.woods.filter((w) => w.freeStart).map((w) => w.tier)).toEqual(['hard', 'hard', 'hard'])
    expect(GENERATED.woods.filter((w) => w.round).map((w) => w.id)).toEqual(['ws4'])
  })

  for (const walk of WALKS.filter((w) => parkIds.includes(w.id))) {
    it(`park ${walk.id}: every simple strategy snaps the leash, a careful player gets through`, () => {
      const course = makeCourse(walk)
      expect(course.speed).toBeLessThan(2)
      const game = parkGame(course)
      for (const id of STRATEGIES) expect(playStrategy(game, id).arrived, id).toBe(false)
      expect(playCareful(game, (state) => advice(course, state)).arrived).toBe(true)
    })
  }

  for (const walk of WOODS.filter((w) => woodsIds.includes(w.id))) {
    it(`woods ${walk.id}: hard, and winding matters`, () => {
      const course = makeWoodsCourse(walk, walk.bestStart ?? 0)
      const plain = frechetDistance(walk.person, walk.dog)
      // The shortest leash in the woods is clearly longer than without trees.
      expect(course.shortest).toBeGreaterThanOrEqual(1.15 * plain)
      const game = woodsGame(course)
      const outcomes = STRATEGIES.map((id) => playStrategy(game, id))
      for (const [i, id] of STRATEGIES.entries()) expect(outcomes[i]!.arrived, id).toBe(false)
      // Winding matters: the computer's walk wraps the leash a full turn round a post, or most simple
      // strategies coil it round a post before they snap.
      const coiling = outcomes.filter((o) => o.coil >= 1).length
      expect(wrapAlong(course, course.computer, 0.1) >= 1 || coiling >= 3).toBe(true)
      expect(playCareful(game, (state) => woodsAdvice(course, state)).arrived).toBe(true)
      // Dead ends, as in the park's harder tiers.
      const raster = leashAt(
        course.person,
        course.dog,
        course.trees,
        course.start,
        samplePositions(course.person.length, 0.1),
        samplePositions(course.dog.length, 0.1),
      )
      expect(
        freeSpaceReport(raster, course.leash, course.person, course.dog).deadEnds.length,
      ).toBeGreaterThanOrEqual(3)
      // With a free start, the straight start is clearly not the best.
      if (walk.freeStart) expect(walk.starts![0]!.target).toBeGreaterThanOrEqual(1.15 * walk.target)
    }, 60_000)
  }
})
