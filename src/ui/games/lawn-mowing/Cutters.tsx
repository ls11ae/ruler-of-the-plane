import type { Lawn } from '../../../core/games/lawn-mowing/mowing'
import type { Vec2 } from '../../../core/geometry/types'
import { useBoard } from '../../components/boardContext'
import { art, CUTTER_COLOURS } from './art'
import { cutterCentre, footprintBox, simplify } from './geometry'

export interface CutterView {
  start: Vec2
  at: Vec2
  walk: readonly Vec2[]
  /** The way back to the start if "Feierabend" were pressed now (shown dashed). */
  home: readonly Vec2[]
}

const line = (lawn: Lawn, points: readonly Vec2[]) =>
  simplify(points.map((p) => cutterCentre(lawn, p)))
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`)
    .join('')

/** The tours so far (coloured lines through the cutters' centres), the starts and the ways home. */
export function Tours({ lawn, cutters }: { lawn: Lawn; cutters: readonly CutterView[] }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  return (
    <g aria-hidden="true" pointerEvents="none">
      {cutters.map((c, i) => {
        const colour = CUTTER_COLOURS[i]!
        const [sx, sy] = cutterCentre(lawn, c.start)
        return (
          <g key={i}>
            {c.home.length > 0 && (
              <path
                d={line(lawn, [c.at, ...c.home])}
                fill="none"
                stroke={colour}
                strokeOpacity={0.55}
                strokeWidth={3 * px}
                strokeDasharray={`${4 * px} ${5 * px}`}
                strokeLinecap="round"
              />
            )}
            <path
              d={line(lawn, c.walk)}
              fill="none"
              stroke={colour}
              strokeWidth={4.5 * px}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.9}
            />
            <g transform={board.upright(sx, sy)}>
              <circle
                cx={sx}
                cy={sy}
                r={0.48}
                fill="var(--paper)"
                stroke={colour}
                strokeWidth={2.5 * px}
                strokeDasharray={`${4 * px} ${3 * px}`}
              />
              <text
                x={sx}
                y={sy + 0.2}
                textAnchor="middle"
                fontSize={0.55}
                fontFamily="var(--font-text)"
                fill="var(--ink)"
              >
                S
              </text>
            </g>
          </g>
        )
      })}
    </g>
  )
}

/** The cutters: their footprint (dashed) and a token with the number on top. */
export function CutterTokens({ lawn, cutters }: { lawn: Lawn; cutters: readonly CutterView[] }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  return (
    <g pointerEvents="none">
      {cutters.map((c, i) => {
        const colour = CUTTER_COLOURS[i]!
        const box = footprintBox(lawn, c.at)
        const [cx, cy] = cutterCentre(lawn, c.at)
        // The Scribble token's disc fills two thirds of its image: about one cell wide at r = 0.75.
        const r = 0.75
        return (
          <g key={i} data-testid={`cutter-${i + 1}`}>
            <rect
              x={box.minX}
              y={box.minY}
              width={box.maxX - box.minX}
              height={box.maxY - box.minY}
              fill={colour}
              fillOpacity={0.16}
              stroke={colour}
              strokeWidth={2.5 * px}
              strokeDasharray={`${6 * px} ${4 * px}`}
              rx={0.08}
            />
            <g transform={board.upright(cx, cy)}>
              <image href={art.tokens[i]} x={cx - r} y={cy - r} width={2 * r} height={2 * r} />
              <circle
                cx={cx}
                cy={cy}
                r={r * 0.34}
                fill="var(--paper)"
                stroke="var(--ink)"
                strokeWidth={1.5 * px}
              />
              <text
                x={cx}
                y={cy + r * 0.16}
                textAnchor="middle"
                fontSize={r * 0.48}
                fontFamily="var(--font-text)"
                fill="var(--ink)"
              >
                {i + 1}
              </text>
            </g>
          </g>
        )
      })}
    </g>
  )
}
