import { memo, useMemo } from 'react'
import type { RoadsMap } from '../../../core/games/roads/levels'
import type { Vec2 } from '../../../core/geometry/types'
import { mulberry32 } from '../../../core/random'
import { useBoard } from '../../components/boardContext'
import { SCENERY } from './art'

type Kind = keyof typeof SCENERY

/** Trees and rocks between the places, seeded by the map, never on a place. */
function sceneryOf(map: RoadsMap): { kind: Kind; at: Vec2; size: number }[] {
  const { minX, minY, maxX, maxY } = map.bounds
  const seed = map.points.reduce((h, [x, y]) => (h * 31 + Math.round((x + 7) * 97 + (y + 7) * 13)) >>> 0, 11)
  const rng = mulberry32(seed)
  const out: { kind: Kind; at: Vec2; size: number }[] = []
  const step = Math.max(maxX - minX, maxY - minY) / 9
  for (let y = minY - 0.3; y <= maxY + 0.3; y += step) {
    for (let x = minX - 0.3; x <= maxX + 0.3; x += step) {
      if (rng() < 0.55) continue
      const at: Vec2 = [x + (rng() - 0.5) * step, y + (rng() - 0.5) * step]
      const r = rng()
      const kind: Kind = r < 0.45 ? 'treePines' : r < 0.85 ? 'treePine' : 'rocks'
      const size = (kind === 'treePines' ? 0.62 : 0.42) * step
      if (map.points.some((p) => Math.hypot(p[0] - at[0], p[1] - at[1]) < 0.75 * step)) continue
      out.push({ kind, at, size })
    }
  }
  return out.sort((a, b) => a.at[1] - b.at[1])
}

/** The land: a faint wash and the scattered trees and rocks (drawn under the roads). */
export const Scenery = memo(function Scenery({ map }: { map: RoadsMap }) {
  const board = useBoard()
  const props = useMemo(() => sceneryOf(map), [map])
  const { minX, minY, maxX, maxY } = map.bounds
  return (
    <g pointerEvents="none" opacity={0.75}>
      <rect
        x={minX - 0.6}
        y={minY - 0.6}
        width={maxX - minX + 1.2}
        height={maxY - minY + 1.2}
        rx={0.4}
        fill="var(--land-wash)"
      />
      {props.map((p, i) => (
        <g key={i} transform={board.upright(p.at[0], p.at[1])}>
          <image
            href={SCENERY[p.kind]}
            x={p.at[0] - p.size / 2}
            y={p.at[1] - p.size / 2}
            width={p.size}
            height={p.size}
          />
        </g>
      ))}
    </g>
  )
})
