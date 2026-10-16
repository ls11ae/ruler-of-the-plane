import { describe, expect, it } from 'vitest'
import { frechetDistance, walkLeash } from './frechet'
import { WALKS, type WalkLevel } from './levels'
import {
  advice,
  leashAt,
  makeCourse,
  starsFor,
  startState,
  step,
  stillPossible,
  WALK_SPEED,
  type Course,
  type WalkState,
} from './rules'

const FRAME = 1 / 60

/** Plays a level like a careful player who follows the hint every frame. */
function playByAdvice(course: Course): WalkState {
  let state = startState(course)
  for (let frame = 0; frame < 20000 && state.status === 'walking'; frame++) {
    const a = advice(course, state)
    if (!a) break
    state = step(course, state, { person: a !== 'dog', dog: a !== 'person' }, FRAME)
  }
  return state
}

const line: WalkLevel = {
  id: 'avenue',
  person: [
    [0, 0],
    [10, 0],
  ],
  dog: [
    [0, 1],
    [10, 1],
  ],
  slack: 2,
}

describe('levels', () => {
  it('have at most 20 segments per path, leashes above the minimum, getting tighter', () => {
    let lastSlack = Infinity
    for (const level of WALKS) {
      expect(level.person.length - 1).toBeLessThanOrEqual(20)
      expect(level.dog.length - 1).toBeLessThanOrEqual(20)
      const course = makeCourse(level)
      expect(course.leash).toBeGreaterThanOrEqual(course.shortest + 0.2 - 1e-9)
      expect(course.shortest).toBeCloseTo(frechetDistance(level.person, level.dog), 12)
      expect(walkLeash(course.person, course.dog, course.computer)).toBeLessThanOrEqual(
        course.shortest + 1e-6,
      )
      expect(level.slack).toBeLessThan(lastSlack)
      lastSlack = level.slack
    }
  })

  it('can all be finished at 60 frames per second by following the hint', () => {
    for (const level of WALKS) {
      const course = makeCourse(level)
      const end = playByAdvice(course)
      expect(end.status, level.id).toBe('arrived')
      expect(end.longest).toBeLessThanOrEqual(course.leash)
    }
  })

  it('snap when both just walk on together (except the first, where the leash is long)', () => {
    for (const level of WALKS.slice(1)) {
      const course = makeCourse(level)
      let state = startState(course)
      for (let i = 0; i < 10000 && state.status === 'walking'; i++) {
        state = step(course, state, { person: true, dog: true }, FRAME)
      }
      expect(state.status, level.id).toBe('snapped')
    }
  })
})

describe('walking', () => {
  it('moves the walkers whose keys are held, at the same speed', () => {
    const course = makeCourse(line)
    let state = startState(course)
    state = step(course, state, { person: true, dog: false }, 0.5)
    expect(state.s).toBeCloseTo(WALK_SPEED * 0.5)
    expect(state.t).toBe(0)
    state = step(course, state, { person: true, dog: true }, 0.5)
    expect(state.s).toBeCloseTo(WALK_SPEED)
    expect(state.t).toBeCloseTo(WALK_SPEED * 0.5)
    expect(state.trace).toHaveLength(3)
  })

  it('snaps the leash exactly where it gets too long', () => {
    const course = makeCourse(line)
    let state = startState(course)
    for (let i = 0; i < 600 && state.status === 'walking'; i++) {
      state = step(course, state, { person: true, dog: false }, FRAME)
    }
    expect(state.status).toBe('snapped')
    expect(leashAt(course, state.s, state.t)).toBeCloseTo(course.leash, 6)
    expect(state.longest).toBeLessThanOrEqual(course.leash + 1e-9)
  })

  it('arrives when both are at the end', () => {
    const course = makeCourse(line)
    let state = startState(course)
    for (let i = 0; i < 1000 && state.status === 'walking'; i++) {
      state = step(course, state, { person: true, dog: true }, FRAME)
    }
    expect(state.status).toBe('arrived')
    expect(starsFor(state.longest, course.shortest)).toBe(3)
  })

  it('knows a dead end before the leash snaps', () => {
    // The dog runs up to a bush 3 m off its path and back; the leash allows 3.6 m.
    const spike: WalkLevel = {
      id: 'fetch',
      person: [
        [0, 0],
        [10, 0],
      ],
      dog: [
        [0, 0.5],
        [2, 0.5],
        [2, 3.5],
        [2, 0.5],
        [10, 0.5],
      ],
      slack: 1,
    }
    const course = { ...makeCourse(spike), leash: 3.6 }
    let state = startState(course)
    expect(advice(course, state)).toBe('both')
    // The person walks 3 m ahead alone: still within the leash, but the dog's bush is out of reach now.
    while (state.s < 3) state = step(course, state, { person: true, dog: false }, FRAME)
    expect(state.status).toBe('walking')
    expect(stillPossible(course, state)).toBe(false)
    expect(advice(course, state)).toBeNull()
  })

  it('gives stars by how close the longest leash came to the shortest possible', () => {
    expect(starsFor(3.1, 3)).toBe(3)
    expect(starsFor(3.6, 3)).toBe(2)
    expect(starsFor(4, 3)).toBe(1)
  })
})
