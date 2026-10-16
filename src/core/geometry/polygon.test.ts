import { describe, expect, it } from 'vitest'
import { isSimple, pointInRing, signedArea, validatePolygonWithHoles, type Ring } from './polygon'
import { segmentsIntersect } from './predicates'
import type { Vec2 } from './types'

const square: Ring = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
]
const square2 = (x: number, y: number, s = 1): Ring => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
]

describe('segmentsIntersect', () => {
  it('detects proper crossings, touching and collinear overlap', () => {
    expect(segmentsIntersect([0, 0], [2, 2], [0, 2], [2, 0])).toBe(true)
    expect(segmentsIntersect([0, 0], [2, 0], [1, 0], [1, 5])).toBe(true)
    expect(segmentsIntersect([0, 0], [2, 0], [1, 0], [3, 0])).toBe(true)
    expect(segmentsIntersect([0, 0], [2, 0], [2, 0], [3, 1])).toBe(true)
  })
  it('rejects disjoint segments', () => {
    expect(segmentsIntersect([0, 0], [2, 0], [3, 0], [4, 0])).toBe(false)
    expect(segmentsIntersect([0, 0], [2, 0], [0, 1], [2, 1])).toBe(false)
    expect(segmentsIntersect([0, 0], [2, 2], [3, 0], [2.1, 1.9])).toBe(false)
  })
  it('is exact for nearly collinear points', () => {
    const a: Vec2 = [0.1, 0.1]
    const b: Vec2 = [0.3, 0.3]
    expect(segmentsIntersect(a, b, [0.2, 0.2], [1, 0])).toBe(true)
    expect(segmentsIntersect(a, b, [0.2, 0.2 + 1e-15], [0.2, 1])).toBe(false)
  })
})

describe('polygon', () => {
  it('computes the signed area', () => {
    expect(signedArea(square)).toBe(16)
    expect(signedArea([...square].reverse())).toBe(-16)
  })

  it('recognises simple and non-simple rings', () => {
    expect(isSimple(square)).toBe(true)
    expect(
      isSimple([
        [0, 0],
        [2, 2],
        [2, 0],
        [0, 2],
      ]),
    ).toBe(false) // bow tie
    expect(
      isSimple([
        [0, 0],
        [2, 0],
        [1, 0],
        [1, 1],
      ]),
    ).toBe(false) // folds back
    expect(
      isSimple([
        [0, 0],
        [1, 0],
        [2, 0],
      ]),
    ).toBe(false) // degenerate
    expect(
      isSimple([
        [0, 0],
        [4, 0],
        [2, 2],
        [4, 4],
        [0, 4],
        [2, 2],
      ]),
    ).toBe(false) // repeated vertex
  })

  it('locates points like a brute-force ray count', () => {
    const ring: Ring = [
      [0, 0],
      [6, 0],
      [6, 5],
      [3, 2],
      [0, 5],
    ]
    const inside = (p: Vec2) => {
      // Horizontal ray to the right, half-open rule on y.
      let c = false
      for (let i = 0, n = ring.length; i < n; i++) {
        const [x1, y1] = ring[i]!
        const [x2, y2] = ring[(i + 1) % n]!
        if (y1 > p[1] !== y2 > p[1] && p[0] < ((x2 - x1) * (p[1] - y1)) / (y2 - y1) + x1) c = !c
      }
      return c
    }
    for (let x = -0.95; x < 7; x += 0.37) {
      for (let y = -0.95; y < 6; y += 0.41) {
        expect(pointInRing([x, y], ring) === 1).toBe(inside([x, y]))
      }
    }
    expect(pointInRing([3, 0], ring)).toBe(0)
    expect(pointInRing([3, 2], ring)).toBe(0)
  })

  it('validates polygons with holes', () => {
    expect(validatePolygonWithHoles(square, [square2(1, 1), square2(2.5, 2.5)])).toEqual([])
    expect(validatePolygonWithHoles(square, [square2(1, 1), square2(2, 1)])).toEqual(['holes 0 and 1 touch'])
    expect(validatePolygonWithHoles(square, [square2(5, 5)])).toEqual([
      'hole 0 is not inside the outer boundary',
    ])
    expect(validatePolygonWithHoles(square, [square2(3, 1)])).toEqual(['hole 0 touches the outer boundary'])
    expect(validatePolygonWithHoles(square, [square2(0.5, 0.5, 3), square2(1, 1)])).toEqual([
      'holes 0 and 1 are nested',
    ])
  })
})
