import type { Castle, Player } from '../../../core/games/voronoi/rules'
import type { Vec2 } from '../../../core/geometry/types'
import { useBoard } from '../../components/boardContext'
import { art } from './art'
import { PLAYER_COLOURS } from './drawing'
import styles from './Voronoi.module.css'

/** Height of a castle in map units (the map is 16 units wide). */
export const CASTLE_SIZE = 0.95

/**
 * A castle standing on its site `at` (the middle of its base): the Cartography castle on a base in the
 * player's colour, with a pennant that flies towards `facing` (left or right on screen, -1 or 1).
 */
export function CastleSprite({
  at,
  owner,
  facing = 1,
  ghost = false,
}: {
  at: Vec2
  owner: Player
  facing?: -1 | 1
  ghost?: boolean
}) {
  const board = useBoard()
  const [x, y] = at
  const s = CASTLE_SIZE
  const colour = PLAYER_COLOURS[owner]
  const ink = board.pxToBoard(2)
  const poleTop = y - s * 1.28
  const poleBottom = y - s * 0.86
  return (
    <g transform={board.upright(x, y)} opacity={ghost ? 0.7 : 1} pointerEvents="none">
      <ellipse
        cx={x}
        cy={y}
        rx={s * 0.42}
        ry={s * 0.13}
        fill={colour}
        stroke="var(--ink)"
        strokeWidth={ink}
      />
      <image href={art.castle} x={x - s / 2} y={y - s * 0.94} width={s} height={s} />
      <line
        x1={x}
        y1={poleBottom}
        x2={x}
        y2={poleTop}
        stroke="var(--ink)"
        strokeWidth={ink * 1.2}
        strokeLinecap="round"
      />
      <path
        d={`M${x},${poleTop} L${x + facing * s * 0.36},${poleTop + s * 0.08} L${x},${poleTop + s * 0.17} Z`}
        fill={colour}
        stroke="var(--ink)"
        strokeWidth={ink}
        strokeLinejoin="round"
      />
    </g>
  )
}

/** Left or right on screen towards the nearest castle of the other player (as the Unity castles did). */
function facingOf(castle: Castle, castles: readonly Castle[], rotation: 0 | 90): -1 | 1 {
  let best: Castle | null = null
  let bestD = Infinity
  for (const c of castles) {
    if (c.owner === castle.owner) continue
    const d = (c.at[0] - castle.at[0]) ** 2 + (c.at[1] - castle.at[1]) ** 2
    if (d < bestD) {
      best = c
      bestD = d
    }
  }
  if (!best) return 1
  // On a board turned by 90°, screen x is −(board y).
  const dx = rotation ? castle.at[1] - best.at[1] : best.at[0] - castle.at[0]
  return dx < 0 ? -1 : 1
}

/** All castles with their distance rings (radius: half the minimum distance, so rings never overlap). */
export function Castles({
  castles,
  minDist,
  conflicts,
}: {
  castles: readonly Castle[]
  minDist: number
  /** Castles the aimed position is too close to: their rings light up. */
  conflicts: ReadonlySet<number>
}) {
  const board = useBoard()
  // Draw from top to bottom so lower castles overlap higher ones, as on a map.
  const order = castles.map((c, i) => ({ c, i })).sort((a, b) => a.c.at[1] - b.c.at[1])
  return (
    <g>
      {castles.map((c, i) => (
        <circle
          key={`r${i}`}
          cx={c.at[0]}
          cy={c.at[1]}
          r={minDist / 2}
          fill={conflicts.has(i) ? 'rgb(224 83 31 / 18%)' : 'none'}
          stroke={conflicts.has(i) ? 'var(--warn)' : 'var(--ink)'}
          strokeOpacity={conflicts.has(i) ? 1 : 0.28}
          strokeWidth={board.pxToBoard(conflicts.has(i) ? 2.5 : 1.5)}
          strokeDasharray={`${board.pxToBoard(4)} ${board.pxToBoard(4)}`}
        />
      ))}
      {order.map(({ c, i }) => (
        <g key={i} className={i === castles.length - 1 ? styles.newCastle : undefined}>
          <CastleSprite at={c.at} owner={c.owner} facing={facingOf(c, castles, board.rotation)} />
        </g>
      ))}
    </g>
  )
}
