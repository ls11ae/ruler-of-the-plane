import { describe, expect, it } from 'vitest'
import { diffCodes, gamepadCodes, type GamepadLike } from './gamepad'

const pad = (pressed: number[], axes: number[] = [0, 0]): GamepadLike => ({
  index: 1,
  mapping: 'standard',
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
  axes,
})

describe('gamepad', () => {
  it('maps buttons, d-pad and stick to virtual codes', () => {
    expect([...gamepadCodes(pad([0, 14]))].sort()).toEqual(['Pad1A', 'Pad1Left'])
    expect([...gamepadCodes(pad([], [0.9, -0.7]))].sort()).toEqual(['Pad1Right', 'Pad1Up'])
    expect([...gamepadCodes(pad([], [0.2, 0.3]))]).toEqual([])
  })

  it('diffs snapshots', () => {
    expect(diffCodes(new Set(['a', 'b']), new Set(['b', 'c']))).toEqual({ pressed: ['c'], released: ['a'] })
  })
})
