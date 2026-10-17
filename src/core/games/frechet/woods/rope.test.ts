import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../../geometry/types'
import { mulberry32, type Rng } from '../../../random'
import { makePath, pointAt, pointSegmentDistance } from '../path'
import { cornerGraph, geodesic } from './geodesic'
import { moveDog, movePerson, ropeLength, ropePoints, straightRope, type Rope } from './rope'
import {
  blocked,
  concat,
  inverse,
  makeTree,
  polylineWord,
  raysClear,
  segmentWord,
  subpath,
  type Tree,
} from './trees'

/** Random trees in a 20 × 14 box, apart and with clear rays. */
function randomTrees(rng: Rng, count: number): Tree[] {
  for (;;) {
    const trees = Array.from({ length: count }, () =>
      makeTree([2 + rng() * 16, 2 + rng() * 10], 0.3 + rng() * 0.4, 5 + Math.floor(rng() * 6)),
    )
    if (raysClear(trees, 0.3)) return trees
  }
}

/** A random polyline from near `start` that keeps 0.3 m from every trunk. */
function randomPath(rng: Rng, trees: Tree[], start: Vec2, segments: number): Vec2[] {
  const clear = (p: Vec2, q: Vec2) => trees.every((t) => pointSegmentDistance(t.centre, p, q) > 1.1)
  for (;;) {
    const pts: Vec2[] = [start]
    for (let i = 0; i < segments && pts.length === i + 1; i++) {
      for (let tries = 0; tries < 50; tries++) {
        const q: Vec2 = [1 + rng() * 18, 1 + rng() * 12]
        if (clear(pts[pts.length - 1]!, q)) {
          pts.push(q)
          break
        }
      }
    }
    if (pts.length === segments + 1) return pts
  }
}

describe('words', () => {
  it('cancel a crossing and its reverse, and add up along a polyline', () => {
    const trees = [makeTree([5, 5])]
    // Over the top of the tree from left to right, then back: the word cancels.
    expect(segmentWord([3, 2], [7, 2], trees)).toEqual([1])
    expect(segmentWord([7, 2], [3, 2], trees)).toEqual([-1])
    expect(segmentWord([3, 8], [7, 8], trees)).toEqual([])
    expect(
      polylineWord(
        [
          [3, 2],
          [7, 2],
          [3, 2.5],
        ],
        trees,
      ),
    ).toEqual([])
    // A point exactly on the ray counts as right of it: no double count at a shared end.
    expect([...segmentWord([3, 2], [5, 2], trees), ...segmentWord([5, 2], [7, 2], trees)]).toEqual([1])
    expect(concat([1, 2], [-2, -1, 3])).toEqual([3])
    expect(inverse([1, -2])).toEqual([2, -1])
  })

  it('see a trunk block a segment but not a segment along its edge', () => {
    const tree = makeTree([5, 5], 1, 4)
    const [c0, c1] = tree.trunk
    expect(blocked([tree], [3, 5], [7, 5])).toBe(true)
    expect(blocked([tree], c0!, c1!)).toBe(false)
    expect(blocked([tree], [3, 3], [3, 7])).toBe(false)
  })
})

describe('taut leash', () => {
  it('wraps around a trunk and comes free again', () => {
    const tree = makeTree([5, 5], 0.5)
    const trees = [tree]
    let rope: Rope = straightRope([4, 8], [6, 8])
    // The dog runs up past the tree on the right and over to the left: the leash catches.
    for (const p of [
      [6, 6],
      [6, 3],
      [4, 3],
    ] as Vec2[]) {
      rope = moveDog(rope, p, trees)
    }
    expect(rope.wraps.length).toBeGreaterThan(0)
    expect(ropeLength(rope, trees)).toBeGreaterThan(Math.hypot(0, 5) + 0.5)
    // The person follows the same way round: the leash comes free.
    for (const p of [
      [6, 8],
      [6, 3.5],
      [4, 3.5],
    ] as Vec2[]) {
      rope = movePerson(rope, p, trees)
    }
    expect(rope.wraps).toEqual([])
    expect(ropeLength(rope, trees)).toBeCloseTo(0.5, 9)
  })

  it('agrees with the shortest curve of its class computed from scratch, on random walks', () => {
    const rng = mulberry32(2026)
    let wrapped = 0
    for (let scene = 0; scene < 40; scene++) {
      const trees = randomTrees(rng, 2 + Math.floor(rng() * 4))
      const graph = cornerGraph(trees)
      const person = makePath(randomPath(rng, trees, [1, 13], 6))
      const dog = makePath(randomPath(rng, trees, [1.4, 13.4], 6))
      const a0 = pointAt(person, 0)
      const b0 = pointAt(dog, 0)
      if (blocked(trees, a0, b0)) continue
      let rope = straightRope(a0, b0)
      let word = segmentWord(a0, b0, trees)
      let s = 0
      let t = 0
      for (let move = 0; move < 120 && (s < person.length || t < dog.length); move++) {
        const r = rng()
        const ds = r < 0.6 ? rng() * 1.5 : 0
        const dt = r > 0.3 ? rng() * 1.5 : 0
        const s1 = Math.min(person.length, s + ds)
        const t1 = Math.min(dog.length, t + dt)
        // Each walker follows its path, corner by corner.
        const ps = subpath(person, s, s1)
        for (const p of ps.slice(1)) rope = movePerson(rope, p, trees)
        word = concat(inverse(polylineWord(ps, trees)), word)
        const qs = subpath(dog, t, t1)
        for (const q of qs.slice(1)) rope = moveDog(rope, q, trees)
        word = concat(word, polylineWord(qs, trees))
        s = s1
        t = t1
        const pts = ropePoints(rope, trees)
        expect(polylineWord(pts, trees), `scene ${scene} move ${move}`).toEqual(word)
        for (let i = 0; i + 1 < pts.length; i++) expect(blocked(trees, pts[i]!, pts[i + 1]!)).toBe(false)
        const g = geodesic(graph, rope.a, rope.b, word)!
        expect(ropeLength(rope, trees), `scene ${scene} move ${move}`).toBeCloseTo(g.length, 9)
        expect(
          rope.wraps.map((w) => graph.owner.findIndex(([k, j]) => k === w.tree && j === w.corner)),
        ).toEqual(g.corners)
        if (rope.wraps.length > 0) wrapped++
      }
    }
    // The random walks really did wrap the leash around trunks.
    expect(wrapped).toBeGreaterThan(200)
  })

  it('lies the same way whatever the order of the moves: the positions decide', () => {
    const rng = mulberry32(7)
    for (let scene = 0; scene < 20; scene++) {
      const trees = randomTrees(rng, 4)
      const person = makePath(randomPath(rng, trees, [1, 13], 5))
      const dog = makePath(randomPath(rng, trees, [1.4, 13.4], 5))
      const start = straightRope(pointAt(person, 0), pointAt(dog, 0))
      if (blocked(trees, start.a, start.b)) continue
      const s = rng() * person.length
      const t = rng() * dog.length
      // Person first, then the dog …
      let one = start
      for (const p of subpath(person, 0, s).slice(1)) one = movePerson(one, p, trees)
      for (const q of subpath(dog, 0, t).slice(1)) one = moveDog(one, q, trees)
      // … or the dog first, then the person.
      let two = start
      for (const q of subpath(dog, 0, t).slice(1)) two = moveDog(two, q, trees)
      for (const p of subpath(person, 0, s).slice(1)) two = movePerson(two, p, trees)
      expect(two.wraps).toEqual(one.wraps)
    }
  })
})
