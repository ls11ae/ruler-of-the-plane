import { frechetDistance } from './frechet'
import { freeSpaceReport, parkRaster, samplePositions, type FreeSpaceReport } from './hardness'
import type { WalkLevel } from './levels'
import { advice, leashAt, makeCourse, startState, step, type Course, type WalkState } from './rules'
import {
  playCareful,
  playStrategy,
  STRATEGIES,
  type Outcome,
  type Playable,
  type StrategyId,
} from './strategies'
import { leashAt as woodsLeashAt } from './woods/field'
import type { WoodsWalk } from './woods/levels'
import {
  leashOf,
  makeWoodsCourse,
  stepWoods,
  tightestInWoods,
  woodsAdvice,
  woodsStart,
  type WoodsCourse,
  type WoodsState,
} from './woods/rules'
import { searchWoods } from './woods/search'

/** The park's rules as something the strategies can play. */
export function parkGame(course: Course): Playable<WalkState> {
  return {
    person: course.person,
    dog: course.dog,
    speed: course.speed,
    start: startState(course),
    step: (state, input, dt) => step(course, state, input, dt),
    where: (state) => state,
    leash: (state) => leashAt(course, state.s, state.t),
  }
}

/** The woods' rules as something the strategies can play. */
export function woodsGame(course: WoodsCourse): Playable<WoodsState> {
  return {
    person: course.person,
    dog: course.dog,
    speed: course.speed,
    start: woodsStart(course),
    step: (state, input, dt) => stepWoods(course, state, input, dt),
    where: (state) => state,
    leash: (state) => leashOf(course, state.rope),
  }
}

/** Everything the docs' table says about a walk. */
export interface Assessment {
  leash: number
  /** Fréchet distance without trees. */
  frechet: number
  /** The shortest leash in the woods (homotopic Fréchet distance), for walks in the woods. */
  woods?: number
  /** The free space at the walk's leash. */
  space: FreeSpaceReport
  /** How often who walks changes on the computer's walk with the shortest leash. */
  changes: number
  strategies: Record<StrategyId, Outcome>
  /** A player who follows the hint, looking at it every quarter of a second. */
  careful: Outcome
  /** Woods only: the longest leash the computer's walk without trees needs in the woods. */
  plainWalkInWoods?: number
}

/** Raster step for the free space and the computer's walk (metres along each path). */
export const ASSESS_STEP = 0.05

export function assessPark(level: WalkLevel, rasterStep = ASSESS_STEP): Assessment {
  const course = makeCourse(level)
  const game = parkGame(course)
  const strategies = Object.fromEntries(STRATEGIES.map((id) => [id, playStrategy(game, id)])) as Record<
    StrategyId,
    Outcome
  >
  const computer = searchWoods(level.person, level.dog, [], rasterStep)
  return {
    leash: course.leash,
    frechet: course.shortest,
    space: freeSpaceReport(
      parkRaster(course.person, course.dog, rasterStep),
      course.leash,
      course.person,
      course.dog,
    ),
    changes: computer.walk.length - 2,
    strategies,
    careful: playCareful(game, (state) => advice(course, state)),
  }
}

export function assessWoods(walk: WoodsWalk, rasterStep = ASSESS_STEP): Assessment {
  const course = makeWoodsCourse(walk)
  const game = woodsGame(course)
  const strategies = Object.fromEntries(STRATEGIES.map((id) => [id, playStrategy(game, id)])) as Record<
    StrategyId,
    Outcome
  >
  const s = samplePositions(course.person.length, rasterStep)
  const t = samplePositions(course.dog.length, rasterStep)
  const raster = woodsLeashAt(course.person, course.dog, course.trees, course.start, s, t)
  // The computer's best walk without trees, walked in the woods.
  const plain = searchWoods(walk.person, walk.dog, [], rasterStep)
  return {
    leash: course.leash,
    frechet: frechetDistance(walk.person, walk.dog),
    woods: course.shortest,
    space: freeSpaceReport(raster, course.leash, course.person, course.dog),
    changes: walk.computer.length - 2,
    strategies,
    careful: playCareful(game, (state) => woodsAdvice(course, state)),
    plainWalkInWoods: tightestInWoods(course, plain.walk).leash,
  }
}
