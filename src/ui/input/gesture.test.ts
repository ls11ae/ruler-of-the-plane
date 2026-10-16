import { describe, expect, it } from 'vitest'
import { GestureTracker } from './gesture'

describe('GestureTracker', () => {
  const opts = { dragThreshold: 8, longPressMs: 500 }

  it('recognises taps, drags and long presses', () => {
    const tap = new GestureTracker(10, 10, 0, opts)
    expect(tap.move(13, 12, 50)).toBe(false)
    expect(tap.end(120)).toBe('tap')

    const drag = new GestureTracker(10, 10, 0, opts)
    expect(drag.move(30, 10, 50)).toBe(true)
    expect(drag.move(40, 10, 900)).toBe(false)
    expect(drag.end(1000)).toBe('drag')

    const hold = new GestureTracker(10, 10, 0, opts)
    expect(hold.tick(499)).toBe(false)
    expect(hold.tick(500)).toBe(true)
    expect(hold.move(40, 10, 600)).toBe(false)
    expect(hold.end(700)).toBe('longpress')
  })
})
