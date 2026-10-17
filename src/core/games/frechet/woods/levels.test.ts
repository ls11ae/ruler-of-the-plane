import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../../geometry/types'
import { frechetDistance, optimalWalk } from '../frechet'
import { makePath, pointAt, pointSegmentDistance } from '../path'
import { WOODS } from './levels'
import { moveDogAlong, movePersonAlong, ropeLength, ropePoints, turnsAround } from './rope'
import {
  leashOf,
  makeWoodsCourse,
  ropeAt,
  stepWoods,
  woodsAdvice,
  woodsStart,
  type WoodsCourse,
  type WoodsState,
} from './rules'
import { searchWoods } from './search'
import { SEARCH_STEP, startOf, treesOf, WOODS_SHAPES } from './shapes'
import { blocked, insideBy, polylineWord, raysClear, segmentWord } from './trees'

const FRAME = 1 / 60

/** Winding number of a closed polyline around a point. */
function winding(ring: readonly Vec2[], [px, py]: Vec2): number {
  let w = 0
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]!
    const [bx, by] = ring[(i + 1) % ring.length]!
    const cross = (bx - ax) * (py - ay) - (px - ax) * (by - ay)
    if (ay <= py) {
      if (by > py && cross > 0) w++
    } else if (by <= py && cross < 0) w--
  }
  return w
}

/** Plays the walk like a careful player who follows the hint every frame. */
function playByAdvice(course: WoodsCourse): WoodsState {
  let state = woodsStart(course)
  for (let frame = 0; frame < 30000 && state.status === 'walking'; frame++) {
    const a = woodsAdvice(course, state)
    if (!a) break
    state = stepWoods(course, state, { person: a !== 'dog', dog: a !== 'person' }, FRAME)
  }
  return state
}

/** Walks a given walk with the game's step (frames of at most 1/60 s), with the leash of the course. */
function replay(course: WoodsCourse, walk: [number, number][]): WoodsState {
  let state = woodsStart(course)
  for (let k = 1; k < walk.length && state.status === 'walking'; k++) {
    // The stored walk is rounded to 0.1 mm; its end is the end of both paths.
    const last = k === walk.length - 1
    const s1 = last ? course.person.length : walk[k]![0]
    const t1 = last ? course.dog.length : walk[k]![1]
    const person = s1 > walk[k - 1]![0]
    const dog = t1 > walk[k - 1]![1]
    for (let guard = 0; guard < 100000 && state.status === 'walking'; guard++) {
      const rest = Math.max(person ? s1 - state.s : 0, dog ? t1 - state.t : 0)
      if (rest <= 1e-9) break
      state = stepWoods(course, state, { person, dog }, Math.min(FRAME, rest / course.speed))
    }
  }
  return state
}

describe('walks in the woods', () => {
  it('keep trunks off the paths, rays clear, and leave the leash free at the end', () => {
    for (const shape of WOODS_SHAPES) {
      const trees = treesOf(shape)
      expect(raysClear(trees, 0.3), shape.id).toBe(true)
      for (const tree of trees) {
        for (const line of [shape.person, shape.dog]) {
          for (let i = 0; i + 1 < line.length; i++) {
            const d = pointSegmentDistance(tree.centre, line[i]!, line[i + 1]!) - tree.reach
            expect(d, `${shape.id}: a path passes the trunk at ${tree.centre.join(', ')}`).toBeGreaterThan(
              0.3,
            )
          }
        }
        // The loop "start leash, dog's trail, straight back, person's path back" must not wind round a
        // trunk: such a trunk would catch the leash for good, as both only walk forwards.
        const ring = [...(shape.before ?? [shape.dog[0]!]), ...shape.dog, ...[...shape.person].reverse()]
        expect(winding(ring, tree.centre), `${shape.id}: tree ${tree.centre.join(', ')}`).toBe(0)
        expect(insideBy(tree, shape.person[0]!)).toBeLessThan(0)
      }
      const first = shape.before?.[0] ?? shape.dog[0]!
      expect(blocked(trees, shape.person[0]!, first)).toBe(false)
    }
  })

  // One search per walk: several seconds for the longer generated walks.
  for (const walk of WOODS) {
    it(`${walk.id}: stores the target and walk of a fresh search, and the rope agrees with the search`, () => {
      const start = startOf(walk, walk.trees)
      const found = searchWoods(walk.person, walk.dog, walk.trees, SEARCH_STEP, { start })
      expect(walk.target, walk.id).toBeCloseTo(found.target, 4)
      expect(walk.computer.length, walk.id).toBe(found.walk.length)
      walk.computer.forEach(([s, t], k) => {
        expect(s).toBeCloseTo(found.walk[k]![0], 4)
        expect(t).toBeCloseTo(found.walk[k]![1], 4)
      })
      // The leash lies only one way at each pair of positions (the start and the positions decide).
      expect(found.classesPerPosition).toBe(1)
      // The game's rope, carried along the search's walk, has the search's leash and word everywhere.
      const P = makePath(walk.person)
      const Q = makePath(walk.dog)
      let rope = start
      let s = 0
      let t = 0
      let wrapped = 0
      for (const sample of found.samples) {
        rope = movePersonAlong(rope, P, s, sample.s, walk.trees)
        rope = moveDogAlong(rope, Q, t, sample.t, walk.trees)
        s = sample.s
        t = sample.t
        expect(ropeLength(rope, walk.trees), `${walk.id} at ${s}, ${t}`).toBeCloseTo(sample.leash, 9)
        expect(polylineWord(ropePoints(rope, walk.trees), walk.trees)).toEqual(sample.word)
        if (rope.wraps.length > 0) wrapped++
      }
      // Not trivially: on its walk, the computer lets the leash touch a trunk somewhere (except where
      // walking round together keeps it clear).
      if (walk.id === 'fetch' || walk.id === 'bakery') expect(wrapped).toBeGreaterThan(0)
      // At the castle the leash lies straight (as the straight segment between the two).
      const end = found.samples[found.samples.length - 1]!
      expect(end.word).toEqual(segmentWord(pointAt(P, P.length), pointAt(Q, Q.length), walk.trees))
    }, 30_000)
  }

  it('can be walked with the stored walk and by following the hint, but not by walking together', () => {
    for (const walk of WOODS) {
      const course = makeWoodsCourse(walk)
      expect(course.leash).toBeGreaterThanOrEqual(course.shortest + 0.2 - 1e-9)
      const computer = replay(course, walk.computer)
      expect(computer.status, `${walk.id}: the computer's walk`).toBe('arrived')
      // Between the samples the leash can be a little longer than the target.
      expect(computer.longest).toBeLessThan(course.shortest + 2 * SEARCH_STEP)
      const careful = playByAdvice(course)
      expect(careful.status, `${walk.id}: following the hint`).toBe('arrived')
      expect(careful.longest).toBeLessThanOrEqual(course.leash)
      let together = woodsStart(course)
      for (let i = 0; i < 20000 && together.status === 'walking'; i++) {
        together = stepWoods(course, together, { person: true, dog: true }, FRAME)
      }
      expect(together.status, `${walk.id}: both walking together`).toBe('snapped')
    }
  })

  it('need a longer leash in the woods than in the open where the leash would catch', () => {
    const fetch = WOODS.find((w) => w.id === 'fetch')!
    const plain = frechetDistance(fetch.person, fetch.dog)
    expect(plain).toBeLessThan(0.8 * fetch.target)
    // The computer's walk without trees would catch the leash on the beech.
    const course = makeWoodsCourse(fetch)
    const { walk } = optimalWalk(fetch.person, fetch.dog)
    let longest = 0
    let rope = course.start
    let [s, t] = [0, 0]
    for (const [s1, t1] of walk.slice(1)) {
      for (let k = 1; k <= 50; k++) {
        const ns = s + ((s1 - s) * k) / 50
        const nt = t + ((t1 - t) * k) / 50
        rope = moveDogAlong(
          movePersonAlong(rope, course.person, s + ((s1 - s) * (k - 1)) / 50, ns, course.trees),
          course.dog,
          t + ((t1 - t) * (k - 1)) / 50,
          nt,
          course.trees,
        )
        longest = Math.max(longest, leashOf(course, rope))
      }
      ;[s, t] = [s1, t1]
    }
    expect(longest).toBeGreaterThan(fetch.target + 0.2)
    // The rope carried there equals the rope computed for the end position directly.
    expect(ropeAt(course, s, t).wraps).toEqual(rope.wraps)
  })

  it('round the lamp post and in the figure-eight: one coil fits the leash, two do not', () => {
    for (const id of ['lamp', 'eight'] as const) {
      const walk = WOODS.find((w) => w.id === id)!
      const course = makeWoodsCourse(walk)
      const start = startOf(walk, walk.trees)
      walk.trees.forEach((_, tree) => {
        const coil = (turns: number) =>
          searchWoods(walk.person, walk.dog, walk.trees, 0.1, { start, coil: { tree, turns } }).target
        // A walk with the dog a loop ahead (the leash coiled once round the post) fits with room to
        // spare; with two coils the leash would snap.
        expect(coil(1), `${id}: one coil round tree ${tree}`).toBeLessThan(course.leash - 0.3)
        let two = Infinity
        try {
          two = coil(2)
        } catch {
          // No walk coils it twice at all.
        }
        expect(two, `${id}: two coils round tree ${tree}`).toBeGreaterThan(course.leash + 0.25)
      })
    }
  }, 30_000)

  it('outside the bakery: the leash starts wound twice round the post, and the person must wait', () => {
    const walk = WOODS.find((w) => w.id === 'bakery')!
    const course = makeWoodsCourse(walk)
    expect(Math.abs(turnsAround(course.start, walk.trees, 0))).toBe(2)
    expect(leashOf(course, course.start)).toBeLessThan(course.leash)
    // The person walking off first snaps the leash within a few steps.
    let state = woodsStart(course)
    for (let i = 0; i < 600 && state.status === 'walking'; i++)
      state = stepWoods(course, state, { person: true, dog: false }, FRAME)
    expect(state.status).toBe('snapped')
    expect(state.s).toBeLessThan(4)
  })
})
