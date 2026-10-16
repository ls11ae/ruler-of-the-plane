import { useId, type ReactNode } from 'react'
import type { Castle } from '../../../core/games/voronoi/rules'
import type { Vec2 } from '../../../core/geometry/types'
import { useBoard } from '../../components/boardContext'
import { PLAYER_COLOURS, ringPath } from './drawing'

/** Everything inside is clipped to the land (territories count only there). */
export function LandClip({ land, children }: { land: string; children: ReactNode }) {
  const id = `land-${useId().replace(/[^\w-]/g, '')}`
  return (
    <>
      <clipPath id={id}>
        <path d={land} clipRule="evenodd" />
      </clipPath>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  )
}

/** The players' territories as colour washes on the land, with dashed borders between the cells. */
export function Territories({
  castles,
  cells,
  borders,
}: {
  castles: readonly Castle[]
  cells: readonly (readonly Vec2[])[]
  /** All Voronoi edges between cells, as one SVG path. */
  borders: string
}) {
  const board = useBoard()
  return (
    <g aria-hidden="true">
      {cells.map((cell, i) => (
        <path key={i} d={ringPath(cell)} fill={PLAYER_COLOURS[castles[i]!.owner]} fillOpacity={0.3} />
      ))}
      <path
        d={borders}
        fill="none"
        stroke="var(--ink)"
        strokeOpacity={0.55}
        strokeWidth={board.pxToBoard(1.6)}
        strokeDasharray={`${board.pxToBoard(6)} ${board.pxToBoard(5)}`}
      />
    </g>
  )
}

/** The cell a castle at the aimed position would get: a stronger wash with a dashed outline. */
export function PreviewCell({ cell, owner }: { cell: readonly Vec2[]; owner: 0 | 1 }) {
  const board = useBoard()
  return (
    <path
      d={ringPath(cell)}
      fill={PLAYER_COLOURS[owner]}
      fillOpacity={0.28}
      stroke={PLAYER_COLOURS[owner]}
      strokeWidth={board.pxToBoard(3)}
      strokeDasharray={`${board.pxToBoard(8)} ${board.pxToBoard(5)}`}
      pointerEvents="none"
    />
  )
}
