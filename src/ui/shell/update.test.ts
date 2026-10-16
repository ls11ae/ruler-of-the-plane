import { describe, expect, it } from 'vitest'
import { canReloadNow } from './update'

describe('canReloadNow', () => {
  it('reloads on the start map and on the attract screen', () => {
    expect(canReloadNow({ onStartMap: true, attract: false, staffOpen: false })).toBe(true)
    expect(canReloadNow({ onStartMap: false, attract: true, staffOpen: false })).toBe(true)
  })

  it('never reloads during a game or while the staff menu is open', () => {
    expect(canReloadNow({ onStartMap: false, attract: false, staffOpen: false })).toBe(false)
    expect(canReloadNow({ onStartMap: true, attract: false, staffOpen: true })).toBe(false)
  })
})
