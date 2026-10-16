import { useId, useMemo } from 'react'
import { holeKind, rasterize } from '../../../core/games/lawn-mowing/grid'
import type { Bounds, Vec2 } from '../../../core/geometry/types'
import type { LawnMowingLevel } from '../../../core/levels/schema'
import { useBoard } from '../../components/boardContext'
import { art } from './art'
import { ringsPath, runs, toBoard } from './geometry'

const GRASS = '#8fca6a'
const GRASS_DARK = '#79b957'
const MOWED = '#cfeab0'
const MOWED_STRIPE = '#bfe09c'
const POND = '#b9d6ee'

/** Grid paper around the lawn (the Scribble floor tile spans 2 × 2 cells). */
export function Paper({ bounds }: { bounds: Bounds }) {
  const id = `paper-${useId().replace(/[^\w-]/g, '')}`
  return (
    <>
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" x={0} y={0} width={2} height={2}>
          <image href={art.paper} x={0} y={0} width={2} height={2} preserveAspectRatio="none" />
        </pattern>
      </defs>
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.maxX - bounds.minX}
        height={bounds.maxY - bounds.minY}
        fill="#fbfaf6"
      />
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.maxX - bounds.minX}
        height={bounds.maxY - bounds.minY}
        fill={`url(#${id})`}
        opacity={0.75}
      />
    </>
  )
}

/** The lawn: uncut grass, the holes (pond, trees, flower beds) and the ink outline on top of the mowing. */
export function LawnBase({ level }: { level: LawnMowingLevel }) {
  const id = useId().replace(/[^\w-]/g, '')
  const lawn = ringsPath([level.outer, ...level.holes])
  const holes = useMemo(
    () =>
      level.holes.map((ring) => {
        const cells = rasterize([ring])
        return { ring, kind: holeKind(ring), cells: cells.cells() }
      }),
    [level],
  )
  return (
    <g aria-hidden="true">
      <defs>
        <pattern id={`${id}-grass`} patternUnits="userSpaceOnUse" x={0} y={0} width={1} height={1}>
          <rect width={1} height={1} fill={GRASS} />
          <rect width={1} height={1} fill="none" stroke={GRASS_DARK} strokeWidth={0.04} />
          <image href={art.grass} width={1} height={1} opacity={0.55} />
        </pattern>
        <pattern id={`${id}-water`} patternUnits="userSpaceOnUse" x={0} y={0} width={1} height={1}>
          <rect width={1} height={1} fill={POND} />
          <image href={art.water} width={1} height={1} opacity={0.8} />
        </pattern>
        <pattern id={`${id}-plants`} patternUnits="userSpaceOnUse" x={0} y={0} width={1} height={1}>
          <rect width={1} height={1} fill="#f6efe6" />
          <image href={art.plants} width={1} height={1} />
        </pattern>
      </defs>
      <path d={lawn} fill={`url(#${id}-grass)`} fillRule="evenodd" />
      {holes.map(({ ring, kind, cells }, i) => {
        if (kind === 'tree') {
          const b = ringBox(ring)
          return (
            <g key={i}>
              <path d={ringsPath([ring])} fill="#f6efe6" />
              <image href={art.tree} x={b.minX} y={b.minY} width={b.maxX - b.minX} height={b.maxY - b.minY} />
            </g>
          )
        }
        return (
          <g key={i}>
            {cells.map(([x, y]) => (
              <rect
                key={`${x},${y}`}
                x={x}
                y={-(y + 1)}
                width={1}
                height={1}
                fill={`url(#${id}-${kind === 'pond' ? 'water' : 'plants'})`}
              />
            ))}
          </g>
        )
      })}
    </g>
  )
}

function ringBox(ring: readonly Vec2[]): Bounds {
  const pts = ring.map(toBoard)
  return {
    minX: Math.min(...pts.map(([x]) => x)),
    maxX: Math.max(...pts.map(([x]) => x)),
    minY: Math.min(...pts.map(([, y]) => y)),
    maxY: Math.max(...pts.map(([, y]) => y)),
  }
}

/** Mowed cells: light green with mowing stripes. */
export function Mowed({ cells }: { cells: readonly Vec2[] }) {
  const id = `mowed-${useId().replace(/[^\w-]/g, '')}`
  return (
    <g aria-hidden="true">
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" x={0} y={0} width={1} height={1}>
          <rect width={1} height={1} fill={MOWED} />
          <rect width={0.5} height={1} fill={MOWED_STRIPE} />
        </pattern>
      </defs>
      {runs(cells).map(([x, y, n]) => (
        <rect key={`${x},${y}`} x={x} y={-(y + 1)} width={n} height={1} fill={`url(#${id})`} />
      ))}
    </g>
  )
}

/** The ink outline of the lawn and its holes. */
export function LawnOutline({ level }: { level: LawnMowingLevel }) {
  const board = useBoard()
  return (
    <path
      d={ringsPath([level.outer, ...level.holes])}
      fill="none"
      stroke="var(--ink)"
      strokeWidth={board.pxToBoard(3)}
      strokeLinejoin="round"
      filter={board.ink}
      aria-hidden="true"
    />
  )
}
