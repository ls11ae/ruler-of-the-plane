import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ROCK_FILE, rockTile } from './rock-tile'

describe('the rock tile of "Licht ins Verlies"', () => {
  it('is committed as generated', () => {
    expect(readFileSync(ROCK_FILE, 'utf8')).toBe(rockTile())
  })

  it('is seamless: every stroke that leaves the tile comes back on the other side', () => {
    const strokes = [...rockTile().matchAll(/M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/g)].map((m) =>
      m.slice(1).map(Number),
    )
    const has = (s: number[]) => strokes.some((t) => t.every((v, i) => Math.abs(v - s[i]!) < 0.11))
    for (const s of strokes) {
      const [x1, y1, x2, y2] = s as [number, number, number, number]
      if (Math.min(x1, x2) < 0) expect(has([x1 + 144, y1, x2 + 144, y2])).toBe(true)
      if (Math.min(y1, y2) < 0) expect(has([x1, y1 + 144, x2, y2 + 144])).toBe(true)
    }
    expect(strokes.length).toBeGreaterThan(200)
  })
})
