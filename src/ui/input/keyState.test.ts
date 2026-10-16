import { describe, expect, it } from 'vitest'
import { KeyRepeater, KeyState, stepsDue } from './keyState'

describe('KeyState', () => {
  it('tracks held keys by code and ignores auto-repeat', () => {
    const s = new KeyState()
    expect(s.press('KeyA', 0)).toBe(true)
    expect(s.press('KeyA', 30)).toBe(false)
    expect(s.press('KeyL', 40)).toBe(true)
    expect(s.held()).toEqual(['KeyA', 'KeyL'])
    expect(s.pressedAt('KeyA')).toBe(0)
    expect(s.release('KeyA')).toBe(true)
    expect(s.release('KeyA')).toBe(false)
    expect(s.releaseAll()).toEqual(['KeyL'])
    expect(s.size).toBe(0)
  })
})

describe('fixed-rate repeat', () => {
  const opts = { delay: 200, interval: 100 }

  it('steps once on the press, then after the delay, then every interval', () => {
    expect([0, 199, 200, 299, 300, 450].map((t) => stepsDue(t, opts))).toEqual([1, 1, 2, 2, 3, 4])
  })

  it('emits due steps per held key and forgets released keys', () => {
    const s = new KeyState()
    const r = new KeyRepeater(opts)
    s.press('KeyW', 1000)
    expect(r.update(s, ['KeyW', 'KeyA'], 1000)).toEqual(['KeyW'])
    expect(r.update(s, ['KeyW', 'KeyA'], 1100)).toEqual([])
    s.press('KeyA', 1150)
    expect(r.update(s, ['KeyW', 'KeyA'], 1200)).toEqual(['KeyW', 'KeyA'])
    expect(r.update(s, ['KeyW', 'KeyA'], 1300)).toEqual(['KeyW'])
    s.release('KeyW')
    expect(r.update(s, ['KeyW', 'KeyA'], 1400)).toEqual(['KeyA'])
    s.press('KeyW', 1450)
    expect(r.update(s, ['KeyW', 'KeyA'], 1450)).toEqual(['KeyA', 'KeyW'])
  })

  it('ignores keys it does not watch and caps steps after a stalled frame', () => {
    const s = new KeyState()
    const r = new KeyRepeater({ ...opts, maxPerUpdate: 1 })
    s.press('Space', 0)
    s.press('ArrowUp', 0)
    expect(r.update(s, ['ArrowUp'], 0)).toEqual(['ArrowUp'])
    expect(r.update(s, ['ArrowUp'], 1000)).toEqual(['ArrowUp'])
    expect(r.update(s, ['ArrowUp'], 1050)).toEqual([])
    expect(r.update(s, ['ArrowUp'], 1100)).toEqual(['ArrowUp'])
  })
})
