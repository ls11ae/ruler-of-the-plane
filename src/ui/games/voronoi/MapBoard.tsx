import { Delaunay } from 'd3-delaunay'
import { useMemo, type ReactNode } from 'react'
import { cells, nearestCastle, type Castle, type Player } from '../../../core/games/voronoi/rules'
import type { Vec2 } from '../../../core/geometry/types'
import { Board } from '../../components/Board'
import { Castles } from './Castles'
import type { Prepared } from './prepared'
import { Bonuses, MapBase, MapCoast, MapDecor } from './MapArt'
import { LandClip, Territories } from './Territories'

/** The map with its art, territories and castles (also behind the setup and in the attract mode). */
export function MapBoard({
  prep,
  castles,
  minDist,
  label,
  children,
  conflicts = new Set<number>(),
  under,
}: {
  prep: Prepared
  castles: readonly Castle[]
  minDist: number
  label: string
  children?: ReactNode
  conflicts?: ReadonlySet<number>
  /** Drawn on the land under the castles (preview cell, heat map). */
  under?: ReactNode
}) {
  const { map, drawing } = prep
  const f = map.frame
  const voronoi = useMemo(
    () =>
      castles.length
        ? Delaunay.from(castles.map((c) => [c.at[0], c.at[1]])).voronoi([f.minX, f.minY, f.maxX, f.maxY])
        : null,
    [castles, f],
  )
  const cellRings = useMemo(() => cells(map, castles), [map, castles])
  const owners = (p: Vec2): Player | null => {
    const i = nearestCastle(castles, p)
    return i < 0 ? null : castles[i]!.owner
  }
  return (
    <Board bounds={map.frame} padding={0.25} autoRotate label={label}>
      <MapBase map={map} drawing={drawing} />
      <LandClip land={drawing.land}>
        <Territories castles={castles} cells={cellRings} borders={voronoi?.render() ?? ''} />
        {under}
      </LandClip>
      <MapDecor map={map} />
      <MapCoast drawing={drawing} />
      <Bonuses map={map} owners={owners} />
      <Castles castles={castles} minDist={minDist} conflicts={conflicts} />
      {children}
    </Board>
  )
}
