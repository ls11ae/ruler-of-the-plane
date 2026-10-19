import { describe, expect, it } from 'vitest'
import { LAWN } from './art'

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe('the colours of the lawn', () => {
  it('tell mowed from uncut grass clearly (Kevin, 2026-10-19), also the mowing stripes', () => {
    expect(contrast(LAWN.mowed, LAWN.grass)).toBeGreaterThan(2.5)
    expect(contrast(LAWN.mowedStripe, LAWN.grass)).toBeGreaterThan(2.2)
    // The tufts stand out on the uncut grass, the stripes only a little on the mowed cells.
    expect(contrast(LAWN.tuft, LAWN.grass)).toBeGreaterThan(2)
    expect(contrast(LAWN.mowed, LAWN.mowedStripe)).toBeLessThan(1.3)
  })
})
