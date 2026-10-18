import { describe, expect, it } from 'vitest'
import { PARK } from '../../../core/games/frechet/levels'
import { makePath } from '../../../core/games/frechet/path'
import { cameraTarget, cameraZoom, follow } from './camera'

describe('camera', () => {
  it('zooms in so that a short leash is about 220 px long on a laptop, less on a phone', () => {
    // The board area of a 1280 × 800 laptop screen and of a 390 × 844 phone.
    const laptop = cameraZoom(1264, 620, 3.4)!
    expect(3.4 * laptop).toBeCloseTo(220, 6)
    const phone = cameraZoom(374, 560, 3.4)!
    expect(3.4 * phone).toBeGreaterThan(130)
    // The view still spans 2.4 leashes and 3 m (geometric mean of its sides).
    expect(Math.sqrt(374 * 560) / phone).toBeGreaterThanOrEqual(2.4 * 3.4 + 3 - 1e-9)
    // A long leash on a laptop: the park nearly fits anyway, the camera zooms in only a little.
    expect(6.1 * cameraZoom(1264, 620, 6.1)!).toBeCloseTo(220, 6)
    expect(cameraZoom(1264, 620, 9)!).toBeCloseTo((1.3 * 620) / 23.2, 6)
  })

  it('looks ahead along both paths, keeps both walkers in view and stays inside the park', () => {
    const person = makePath([
      [3, 19],
      [33, 4],
    ])
    const dog = makePath([
      [3.8, 19.9],
      [33.8, 4.9],
    ])
    const view = { w: 20, h: 10 }
    const [cx, cy] = cameraTarget(view, person, dog, 0, 0)
    // At the gate the view sits in the park's lower left corner.
    expect(cx).toBeCloseTo(PARK.minX - 0.6 + 10, 9)
    expect(cy).toBeCloseTo(PARK.maxY + 0.6 - 5, 9)
    // Half way, the view's centre lies ahead of the walkers (towards the castle).
    const [mx] = cameraTarget(view, person, dog, 15, 15)
    expect(mx).toBeGreaterThan(3 + (30 * 15) / Math.hypot(30, 15))
    // Moving towards the target, smoothly.
    const step = follow([0, 0], [10, 0], 0.4, 0.4)
    expect(step[0]).toBeCloseTo(10 * (1 - Math.exp(-1)), 9)
  })
})
