import { memo, useMemo } from 'react'
import { PARK } from '../../../../core/games/frechet/levels'
import { coils, ropeLength, type Rope } from '../../../../core/games/frechet/woods/rope'
import { trunkKind, type Trunk, type WoodsShape } from '../../../../core/games/frechet/woods/shapes'
import type { Tree } from '../../../../core/games/frechet/woods/trees'
import type { Vec2 } from '../../../../core/geometry/types'
import { useBoard } from '../../../components/boardContext'
import { art } from '../art'
import { LiveLeash } from '../LiveLeash'
import { MapLabel } from '../ParkArt'
import { CASTLE, GATE, GOAL_LABEL, START_LABEL } from '../scenery'
import { woodsArt } from './art'
import { drawnRadius, drawnRope } from './coil'
import { forestFor, type ForestKind } from './scenery'

const FOREST_ART: Record<ForestKind, string> = {
  treePines: art.treePines,
  treePine: art.treePine,
  treePineLarge: woodsArt.treePineLarge,
  treePinesSmall: woodsArt.treePinesSmall,
}

/** Width of a tree's crown seen from above (metres), by the radius of its trunk. */
const crownWidth = (t: Trunk) => (trunkKind(t) === 'birch' ? 1.9 : Math.max(2.6, 5.5 * t.radius))

/** Each turn of a coiled leash lies this much further out (pixels). */
const TURN_PX = 5.5

const COLOURS: Record<ReturnType<typeof trunkKind>, { fill: string; bark?: string }> = {
  tree: { fill: '#6e5236' },
  post: { fill: '#4a4f57' },
  birch: { fill: '#f4f1e8', bark: 'var(--ink)' },
}

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
 * the leash can catch on, the gate and the castle (a round walk starts and ends at the castle, so its
 * label names both). Static per walk.
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
        if (trunkKind(t) === 'post') return <LampPost key={i} at={t.at} />
        const size = crownWidth(t)
        return (
          <image
            key={i}
            href={woodsArt.crown}
            x={t.at[0] - size / 2}
            y={t.at[1] - size / 2}
            width={size}
            height={size}
            opacity={trunkKind(t) === 'birch' ? 0.55 : 0.8}
            style={{ mixBlendMode: 'multiply' }}
          />
        )
      })}
      {walk.round ? null : walk.bakery ? (
        <Icon href={woodsArt.bakery} at={walk.bakery} width={2.6} />
      ) : (
        <Icon href={art.fence} at={GATE} width={2.2} />
      )}
      <Icon href={art.castle} at={CASTLE} width={3.4} />
      {!walk.round && <MapLabel at={START_LABEL} text={labels.start} />}
      <MapLabel at={GOAL_LABEL} text={labels.goal} />
    </g>
  )
})

/**
 * A lamp post seen from the side (as the map's other icons), its foot at the post: the leash winds
 * round the post at the foot, drawn from above by {@link Trunks}.
 */
function LampPost({ at }: { at: Vec2 }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const [x, y] = at
  return (
    <g transform={board.upright(x, y)} stroke="var(--ink)" strokeWidth={2 * px} strokeLinecap="round">
      <line x1={x} y1={y} x2={x} y2={y - 30 * px} />
      <line x1={x} y1={y - 30 * px} x2={x + 7 * px} y2={y - 34 * px} />
      <rect
        x={x + 3 * px}
        y={y - 40 * px}
        width={9 * px}
        height={10 * px}
        rx={2 * px}
        fill="var(--light-soft, #fbe7a1)"
      />
    </g>
  )
}

/**
 * The trunks the leash can catch on, from above (thin posts drawn at least a few pixels wide); a
 * trunk the leash touches gets a thick orange-red outline.
 */
export function Trunks({
  trees,
  trunks,
  touched,
}: {
  trees: readonly Tree[]
  trunks: readonly Trunk[]
  touched: ReadonlySet<number>
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  return (
    <g pointerEvents="none" data-testid="trunks">
      {trees.map((tree, i) => {
        const kind = trunkKind(trunks[i]!)
        const r = drawnRadius(tree, px)
        const scale = r / tree.reach
        const [cx, cy] = tree.centre
        const pts = tree.trunk.map(([x, y]): Vec2 => [cx + (x - cx) * scale, cy + (y - cy) * scale])
        return (
          <g key={i}>
            <polygon
              points={points(pts)}
              fill={COLOURS[kind].fill}
              stroke={touched.has(i) ? 'var(--warn)' : 'var(--ink)'}
              strokeWidth={(touched.has(i) ? 4 : kind === 'tree' ? 2.5 : 2) * px}
              strokeLinejoin="round"
              filter={kind === 'tree' ? board.ink : undefined}
              data-touched={touched.has(i) || undefined}
              data-kind={kind}
            />
            {COLOURS[kind].bark && (
              <path
                d={`M${cx - r * 0.5},${cy - r * 0.2}h${r * 0.5}M${cx},${cy + r * 0.35}h${r * 0.55}`}
                stroke={COLOURS[kind].bark}
                strokeWidth={1.5 * px}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}

/**
 * The leash as a rope around the trunks, alive (see {@link LiveLeash}); where it winds round a trunk
 * more than once, each turn lies a little further out, with a badge "2×" and the direction at the trunk.
 */
export function RopeLeash({
  rope,
  trees,
  length,
  snapped = false,
  label,
  ghost = false,
}: {
  rope: Rope
  trees: readonly Tree[]
  length: number
  snapped?: boolean
  label?: string
  ghost?: boolean
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const pts = useMemo(
    () => drawnRope(rope, trees, TURN_PX * px, (tree) => drawnRadius(tree, px)),
    [rope, trees, px],
  )
  const wound = useMemo(() => coils(rope, trees), [rope, trees])
  return (
    <g pointerEvents="none">
      <LiveLeash
        points={pts}
        length={length}
        leash={ropeLength(rope, trees)}
        snapped={snapped}
        ghost={ghost}
        label={label}
      />
      {!ghost &&
        wound.map(({ tree, turns }) => (
          <CoilBadge
            key={tree}
            at={trees[tree]!.centre}
            out={drawnRadius(trees[tree]!, px) + (Math.abs(turns) + 1) * TURN_PX * px}
            turns={turns}
          />
        ))}
    </g>
  )
}

/**
 * "2×" and a round arrow beside a trunk the leash is wound round (positive turns are clockwise on
 * screen: board coordinates have y pointing down, and turning the board keeps the sense).
 */
function CoilBadge({ at, out, turns }: { at: Vec2; out: number; turns: number }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const w = 52 * px
  const h = 26 * px
  const c: Vec2 = [at[0] + out + w / 2, at[1] - out - h / 2]
  const r = 7 * px
  const ax = c[0] + w / 2 - 13 * px
  const ay = c[1]
  // A three-quarter circle from the top, clockwise to the left point or anticlockwise to the right.
  const cw = turns > 0
  const end: Vec2 = cw ? [ax - r, ay] : [ax + r, ay]
  const arc = `M${ax},${ay - r} A${r},${r} 0 1 ${cw ? 1 : 0} ${end[0]},${end[1]}`
  // Either way round, the arc ends moving straight up (on screen): the head points up.
  const head = `M${end[0] - 3.5 * px},${end[1] + 4 * px} L${end[0]},${end[1]} L${end[0] + 3.5 * px},${end[1] + 4 * px}`
  return (
    <g transform={board.upright(at[0], at[1])} data-testid="coil-badge" data-turns={turns}>
      <rect
        x={c[0] - w / 2}
        y={c[1] - h / 2}
        width={w}
        height={h}
        rx={6 * px}
        fill="var(--paper)"
        stroke="var(--warn)"
        strokeWidth={2 * px}
      />
      <text
        x={c[0] - w / 2 + 8 * px}
        y={c[1] + 6 * px}
        fontSize={17 * px}
        fontFamily="var(--font-text)"
        fill="var(--ink)"
      >
        {Math.abs(turns)}×
      </text>
      <path d={arc + head} fill="none" stroke="var(--ink)" strokeWidth={2 * px} strokeLinecap="round" />
    </g>
  )
}
