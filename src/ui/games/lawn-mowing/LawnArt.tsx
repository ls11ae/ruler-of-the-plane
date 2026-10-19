import { useId, useMemo } from 'react'
import type { Bounds, Vec2 } from '../../../core/geometry/types'
import type { LawnMowingLevel } from '../../../core/levels/schema'
import { useBoard } from '../../components/boardContext'
import { art, LAWN } from './art'
import { holeCells, ringsPath, runs } from './geometry'

/** Two tufts of uncut grass per cell (short strokes fanning out from the ground). */
const TUFTS = (
  [
    [0.3, 0.62],
    [0.7, 0.3],
  ] as const
)
  .map(([x, y]) => `M${x - 0.08},${y}l0.03,-0.13M${x},${y}l0,-0.16M${x + 0.08},${y}l-0.03,-0.13`)
  .join('')

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

/** Mortar between the stone slabs, and the slabs' tones (cell by cell, so a paving does not look flat). */
export const MORTAR = '#bab3a4'
const SLAB_TONES = ['#ddd7ca', '#d6cfc1', '#e2dccf'] as const

/** A small number per cell (the same on every render), for the tone and the crack of its slab. */
const cellHash = (x: number, y: number) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0

/**
 * Stone slabs on cells (`y` up, as the lawn): a terrace, a paved path or a small paved square inside a
 * lawn, which a mower obviously drives over (Kevin, 2026-10-19). One slab per cell with a joint of mortar
 * around it, inked edges, and a crack in some of them.
 */
export function Slabs({ cells }: { cells: readonly Vec2[] }) {
  return (
    <g aria-hidden="true" data-testid="slabs">
      {cells.map(([x, y]) => (
        <rect key={`m${x},${y}`} x={x} y={-(y + 1)} width={1} height={1} fill={MORTAR} />
      ))}
      {cells.map(([x, y]) => {
        const h = cellHash(x, y)
        const top = -(y + 1)
        return (
          <g key={`${x},${y}`}>
            <rect
              x={x + 0.06}
              y={top + 0.06}
              width={0.88}
              height={0.88}
              rx={0.1}
              fill={SLAB_TONES[h % SLAB_TONES.length]}
              stroke="var(--ink)"
              strokeOpacity={0.55}
              strokeWidth={0.045}
            />
            {h % 4 === 0 && (
              <path
                d={
                  (h >> 3) % 2
                    ? `M${x + 0.22},${top + 0.06}l0.16,0.3l-0.08,0.24`
                    : `M${x + 0.94},${top + 0.62}l-0.28,0.08l-0.2,0.24`
                }
                fill="none"
                stroke="var(--ink)"
                strokeOpacity={0.4}
                strokeWidth={0.035}
                strokeLinecap="round"
              />
            )}
          </g>
        )
      })}
    </g>
  )
}

/** The lawn: uncut grass and its holes as stone slabs (the ink outline goes on top of the mowing). */
export function LawnBase({ level }: { level: LawnMowingLevel }) {
  const id = useId().replace(/[^\w-]/g, '')
  const lawn = ringsPath([level.outer, ...level.holes])
  const slabs = useMemo(() => holeCells(level), [level])
  return (
    <g aria-hidden="true">
      <defs>
        <pattern id={`${id}-grass`} patternUnits="userSpaceOnUse" x={0} y={0} width={1} height={1}>
          <rect width={1} height={1} fill={LAWN.grass} />
          <rect width={1} height={1} fill="none" stroke={LAWN.grassLine} strokeWidth={0.04} />
          <path
            d={TUFTS}
            fill="none"
            stroke={LAWN.tuft}
            strokeOpacity={0.6}
            strokeWidth={0.04}
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <path d={lawn} fill={`url(#${id}-grass)`} fillRule="evenodd" />
      <Slabs cells={slabs} />
    </g>
  )
}

/** Mowed cells: much lighter green than the uncut grass, with mowing stripes. */
export function Mowed({ cells }: { cells: readonly Vec2[] }) {
  const id = `mowed-${useId().replace(/[^\w-]/g, '')}`
  return (
    <g aria-hidden="true">
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" x={0} y={0} width={1} height={1}>
          <rect width={1} height={1} fill={LAWN.mowed} />
          <rect width={0.5} height={1} fill={LAWN.mowedStripe} />
        </pattern>
      </defs>
      {runs(cells).map(([x, y, n]) => (
        <rect key={`${x},${y}`} x={x} y={-(y + 1)} width={n} height={1} fill={`url(#${id})`} />
      ))}
    </g>
  )
}

/**
 * The ink outline of the lawn, and a thinner one round its stone slabs (a paving's edge, not a wall: the
 * mowers drive over it).
 */
export function LawnOutline({ level }: { level: LawnMowingLevel }) {
  const board = useBoard()
  return (
    <g fill="none" stroke="var(--ink)" strokeLinejoin="round" filter={board.ink} aria-hidden="true">
      <path d={ringsPath([level.outer])} strokeWidth={board.pxToBoard(3)} />
      <path d={ringsPath(level.holes)} strokeWidth={board.pxToBoard(1.6)} strokeOpacity={0.8} />
    </g>
  )
}
