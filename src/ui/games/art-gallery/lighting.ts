import { coverage, floorPaths, type Coverage } from '../../../core/games/art-gallery/coverage'
import type { Dungeon } from '../../../core/games/art-gallery/dungeon'
import { visibilityPolygon } from '../../../core/games/art-gallery/visibility'
import type { Vec2 } from '../../../core/geometry/types'

export interface Lighting {
  /** Visibility polygon of a torch (cached by position: dragging recomputes only the moved torch). */
  visibility(at: Vec2): Vec2[]
  /** Lit share, dark region and whether everything is lit. */
  light(torches: readonly Vec2[]): { visibility: Vec2[][]; coverage: Coverage }
}

/** Lighting for one dungeon, with a small cache of visibility polygons. */
export function makeLighting(d: Dungeon): Lighting {
  const floor = floorPaths(d)
  const cache = new Map<string, Vec2[]>()
  const visibility = (at: Vec2) => {
    const key = `${at[0]},${at[1]}`
    let vis = cache.get(key)
    if (!vis) {
      vis = visibilityPolygon(d, at)
      if (cache.size > 200) cache.clear()
      cache.set(key, vis)
    }
    return vis
  }
  return {
    visibility,
    light(torches) {
      const vis = torches.map(visibility)
      return { visibility: vis, coverage: coverage(floor, vis) }
    },
  }
}
