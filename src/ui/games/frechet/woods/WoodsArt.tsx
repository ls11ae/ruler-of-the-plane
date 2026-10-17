import { memo, useMemo } from 'react'
import { PARK } from '../../../../core/games/frechet/levels'
import type { WoodsShape } from '../../../../core/games/frechet/woods/shapes'
import type { Tree } from '../../../../core/games/frechet/woods/trees'
import type { Vec2 } from '../../../../core/geometry/types'
import { useBoard } from '../../../components/boardContext'
import { art } from '../art'
import { Leash, MapLabel } from '../ParkArt'
import { CASTLE, GATE, GOAL_LABEL, START_LABEL } from '../scenery'
import { woodsArt } from './art'
import { forestFor, type ForestKind } from './scenery'

const FOREST_ART: Record<ForestKind, string> = {
  treePines: art.treePines,
  treePine: art.treePine,
  treePineLarge: woodsArt.treePineLarge,
  treePinesSmall: woodsArt.treePinesSmall,
}

/** Width of a tree's crown seen from above (metres), by the radius of its trunk. */
export const crownWidth = (radius: number) => Math.max(2.6, 5.5 * radius)

const points = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

function Icon({ href, at, width }: { href: string; at: Vec2; width: number }) {
  const board = useBoard()
  return (
    <g transform={board.upright(at[0], at[1])}>
      <image href={href} x={at[0] - width / 2} y={at[1] - width / 2} width={width} height={width} />
    </g>
  )
}

/**
 * The woods around the paths: forest out of the leash's reach, the crowns of the trees whose trunks
 * the leash can catch on, the gate and the castle. Static per walk.
 */
export const WoodsScenery = memo(function WoodsScenery({
  walk,
  leash,
  labels,
}: {
  walk: WoodsShape
  leash: number
  labels: { start: string; goal: string }
}) {
  const forest = useMemo(() => forestFor(walk, leash), [walk, leash])
  const { minX, minY, maxX, maxY } = PARK
  return (
    <g pointerEvents="none">
      <rect
        x={minX}
        y={minY}
        width={maxX - minX}
        height={maxY - minY}
        rx={1}
        fill="var(--land-wash)"
        stroke="var(--ink-faint)"
        strokeWidth={0.06}
        strokeDasharray="0.5 0.3"
      />
      {forest.map((p, i) => (
        <Icon key={i} href={FOREST_ART[p.kind]} at={p.at} width={p.size} />
      ))}
      {walk.trunks.map((t, i) => {
        const size = crownWidth(t.radius)
        return (
          <image
            key={i}
            href={woodsArt.crown}
            x={t.at[0] - size / 2}
            y={t.at[1] - size / 2}
            width={size}
            height={size}
            opacity={0.8}
            style={{ mixBlendMode: 'multiply' }}
          />
        )
      })}
      <Icon href={art.fence} at={GATE} width={2.2} />
      <Icon href={art.castle} at={CASTLE} width={3.4} />
      <MapLabel at={START_LABEL} text={labels.start} />
      <MapLabel at={GOAL_LABEL} text={labels.goal} />
    </g>
  )
})

/** The trunks the leash can catch on; a trunk the leash touches gets a thick orange-red outline. */
export function Trunks({ trees, touched }: { trees: readonly Tree[]; touched: ReadonlySet<number> }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  return (
    <g pointerEvents="none" data-testid="trunks">
      {trees.map((tree, i) => (
        <polygon
          key={i}
          points={points(tree.trunk)}
          fill="#6e5236"
          stroke={touched.has(i) ? 'var(--warn)' : 'var(--ink)'}
          strokeWidth={(touched.has(i) ? 4 : 2.5) * px}
          strokeLinejoin="round"
          filter={board.ink}
          data-touched={touched.has(i) || undefined}
        />
      ))}
    </g>
  )
}

/**
 * The leash as a rope: straight (and sagging while slack) when it touches no trunk, otherwise a taut
 * line around the trunk corners.
 */
export function RopeLeash({
  points: pts,
  length,
  taut,
  label,
  ghost = false,
}: {
  points: readonly Vec2[]
  length: number
  taut: boolean
  label?: string
  ghost?: boolean
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  if (pts.length === 2) {
    return <Leash from={pts[0]!} to={pts[1]!} length={length} taut={taut} label={label} ghost={ghost} />
  }
  const colour = taut ? 'var(--warn)' : 'var(--ink)'
  // The badge beside the middle of the longest straight piece.
  let best = 0
  for (let i = 1; i + 1 < pts.length; i++) {
    const d = (k: number) => Math.hypot(pts[k + 1]![0] - pts[k]![0], pts[k + 1]![1] - pts[k]![1])
    if (d(i) > d(best)) best = i
  }
  const [a, b] = [pts[best]!, pts[best + 1]!]
  const d = Math.hypot(b[0] - a[0], b[1] - a[1])
  const nx = d > 0 ? -(b[1] - a[1]) / d : 0
  const ny = d > 0 ? (b[0] - a[0]) / d : 1
  const mid: Vec2 = [(a[0] + b[0]) / 2 - nx * 20 * px, (a[1] + b[1]) / 2 - ny * 20 * px]
  return (
    <g pointerEvents="none" opacity={ghost ? 0.7 : 1}>
      <polyline
        points={points(pts)}
        fill="none"
        stroke={colour}
        strokeWidth={(taut ? 4.5 : 3.5) * px}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={ghost ? `${8 * px} ${5 * px}` : undefined}
      />
      {label && d > 64 * px && <Badge at={mid} text={label} taut={taut} />}
    </g>
  )
}

function Badge({ at, text, taut }: { at: Vec2; text: string; taut: boolean }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const w = (text.length * 8 + 14) * px
  const h = 24 * px
  return (
    <g transform={board.upright(at[0], at[1])}>
      <rect
        x={at[0] - w / 2}
        y={at[1] - h / 2}
        width={w}
        height={h}
        rx={6 * px}
        fill="var(--paper)"
        stroke={taut ? 'var(--warn)' : 'var(--ink)'}
        strokeWidth={2 * px}
      />
      <text
        x={at[0]}
        y={at[1] + 5 * px}
        textAnchor="middle"
        fontSize={15 * px}
        fontFamily="var(--font-text)"
        fill="var(--ink)"
      >
        {text}
      </text>
    </g>
  )
}
