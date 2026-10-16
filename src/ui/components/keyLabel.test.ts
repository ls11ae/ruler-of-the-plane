import { describe, expect, it } from 'vitest'
import { de } from '../i18n/de'
import { keyLabel } from './keyLabel'

describe('keyLabel', () => {
  it('shortens key codes', () => {
    expect(keyLabel('KeyA', de.keys)).toBe('A')
    expect(keyLabel('Digit7', de.keys)).toBe('7')
    expect(keyLabel('Space', de.keys)).toBe('Leertaste')
    expect(keyLabel('ShiftLeft', de.keys)).toBe('Umschalt')
    expect(keyLabel('Pad0Left', de.keys)).toBe('Pad 1 Left')
    expect(keyLabel('BracketLeft', de.keys)).toBe('Bracket')
  })
})
