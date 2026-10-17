import { describe, expect, it } from 'vitest'
import { parkGame, woodsGame } from './assess'
import { frechetDistance } from './frechet'
import { GENERATED } from './generated'
import { HARD_WALK_IDS, MEDIUM_WALK_IDS, WALKS } from './levels'
import { pleasant } from './pleasant'
import { advice, makeCourse } from './rules'
import { playCareful, playStrategy, STRATEGIES } from './strategies'
import { WOODS } from './woods/levels'
import { makeWoodsCourse, tightestInWoods, woodsAdvice } from './woods/rules'
import { searchWoods } from './woods/search'
import { HARD_WOODS_IDS, MEDIUM_WOODS_IDS } from './woods/shapes'

/** The generated tiers "Mittel" and "Schwer" keep what `scripts/gassi/generate.ts` selected them for. */
const parkIds: readonly string[] = [...MEDIUM_WALK_IDS, ...HARD_WALK_IDS]
const woodsIds: readonly string[] = [...MEDIUM_WOODS_IDS, ...HARD_WOODS_IDS]

describe('harder tiers', () => {
  it('are stored with the ids of the game, pleasant to look at', () => {
    expect(GENERATED.park.map((w) => w.id).sort()).toEqual([...parkIds].sort())
    expect(GENERATED.woods.map((w) => w.id).sort()).toEqual([...woodsIds].sort())
    for (const walk of [...GENERATED.park, ...GENERATED.woods]) {
      expect(pleasant(walk.person, walk.dog), walk.id).toBe(true)
    }
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
    it(`woods ${walk.id}: hard, and the trees matter`, () => {
      const course = makeWoodsCourse(walk)
      const plain = frechetDistance(walk.person, walk.dog)
      // The shortest leash in the woods is clearly longer than without trees …
      expect(course.shortest).toBeGreaterThan(1.12 * plain)
      // … and the computer's best walk without trees clearly snaps the leash on a trunk.
      const open = searchWoods(walk.person, walk.dog, [], 0.05)
      expect(tightestInWoods(course, open.walk).leash).toBeGreaterThanOrEqual(1.05 * course.leash)
      const game = woodsGame(course)
      for (const id of STRATEGIES) expect(playStrategy(game, id).arrived, id).toBe(false)
      expect(playCareful(game, (state) => woodsAdvice(course, state)).arrived).toBe(true)
    })
  }
})
