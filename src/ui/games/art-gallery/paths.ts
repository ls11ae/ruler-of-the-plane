import type { Vec2 } from '../../../core/geometry/types'
import type { ArtGalleryLevel } from '../../../core/levels/schema'

/** SVG path of a closed ring. */
export const ringPath = (ring: readonly Vec2[]) => `M${ring.map(([x, y]) => `${x},${y}`).join('L')}Z`

/** SVG path of the floor: outer wall and pillars (fill with even-odd). */
export const floorPath = (level: ArtGalleryLevel) =>
  ringPath(level.outer) + level.holes.map(ringPath).join('')
