import { describe, expect, it } from 'vitest'
import { lastStep, nextLeash } from './challenge'

describe('"Kürzere Leine"', () => {
  it('steps down by 0.3 m to 10 cm above the shortest leash', () => {
    const steps: number[] = []
    for (let leash: number | null = 3.6; leash !== null; leash = nextLeash(leash, 2.23)) steps.push(leash)
    expect(steps).toEqual([3.6, 3.3, 3, 2.7, 2.4])
    expect(lastStep(2.23)).toBe(2.4)
    expect(nextLeash(2.4, 2.23)).toBeNull()
  })
})
