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

/**
 * Diagonal hatching in the second player's colour: orange land is also striped, so the two players
 * differ by more than their colour. Returns the fill to use on top of the wash.
 */
function useHatch(): { fill: string; pattern: ReactNode } {
  const board = useBoard()
  const id = `hatch-${useId().replace(/[^\w-]/g, '')}`
  const gap = board.pxToBoard(9)
  return {
    fill: `url(#${id})`,
    pattern: (
      <defs>
        <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={gap}
            stroke={PLAYER_COLOURS[1]}
            strokeOpacity={0.55}
            strokeWidth={board.pxToBoard(2.2)}
          />
        </pattern>
      </defs>
    ),
  }
}

/** The players' territories as colour washes on the land (the second player's also hatched), with dashed borders between the cells. */
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
  const hatch = useHatch()
  return (
    <g aria-hidden="true">
      {hatch.pattern}
      {cells.map((cell, i) => (
        <path key={i} d={ringPath(cell)} fill={PLAYER_COLOURS[castles[i]!.owner]} fillOpacity={0.3} />
      ))}
      {cells.map((cell, i) =>
        castles[i]!.owner === 1 ? <path key={`h${i}`} d={ringPath(cell)} fill={hatch.fill} /> : null,
      )}
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
  const hatch = useHatch()
  return (
    <g pointerEvents="none">
      {owner === 1 && hatch.pattern}
      <path
        d={ringPath(cell)}
        fill={PLAYER_COLOURS[owner]}
        fillOpacity={0.28}
        stroke={PLAYER_COLOURS[owner]}
        strokeWidth={board.pxToBoard(3)}
        strokeDasharray={`${board.pxToBoard(8)} ${board.pxToBoard(5)}`}
      />
      {owner === 1 && <path d={ringPath(cell)} fill={hatch.fill} />}
    </g>
  )
}
