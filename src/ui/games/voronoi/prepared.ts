import { useMemo } from 'react'
import { prepareMap, type GameMap } from '../../../core/games/voronoi/map'
import type { VoronoiLevel } from '../../../core/levels/schema'
import { mapDrawing, type MapDrawing } from './drawing'

/** A prepared map with everything static to draw it. */
export interface Prepared {
  map: GameMap
  drawing: MapDrawing
}

const prepared = new Map<string, Prepared>()

/** The map prepared for the rules and for drawing, once per map. */
export function usePrepared(level: VoronoiLevel): Prepared {
  return useMemo(() => prepare(level), [level])
}

function prepare(level: VoronoiLevel): Prepared {
  let p = prepared.get(level.id)
  if (!p) {
    const map = prepareMap(level)
    p = { map, drawing: mapDrawing(map) }
    prepared.set(level.id, p)
  }
  return p
}
