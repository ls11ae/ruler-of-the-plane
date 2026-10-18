import { memo, useMemo } from 'react'
import { PARK, type WalkLevel } from '../../../core/games/frechet/levels'
import type { Path } from '../../../core/games/frechet/path'
import type { Vec2 } from '../../../core/geometry/types'
import { offsetRing, smoothClosedPath } from '../../art/sketch'
import { useBoard } from '../../components/boardContext'
import { art, DOG_ASPECT } from './art'
import { walkedPart } from './helpers'
import { CASTLE, GATE, GOAL_LABEL, sceneryFor, START_LABEL, type Prop } from './scenery'

const polyline = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

/** An icon centred at a point, kept upright when the board is turned. */
function Icon({ href, at, width, height }: { href: string; at: Vec2; width: number; height?: number }) {
  const board = useBoard()
  const h = height ?? width
  return (
    <g transform={board.upright(at[0], at[1])}>
      <image href={href} x={at[0] - width / 2} y={at[1] - h / 2} width={width} height={h} />
    </g>
  )
}

/** A label on parchment ("Start", "Ziel"), in pixels, upright. */
export function MapLabel({ at, text }: { at: Vec2; text: string }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const w = (text.length * 10 + 24) * px
  const h = 30 * px
  return (
    <g transform={board.upright(at[0], at[1])} pointerEvents="none">
      <rect
        x={at[0] - w / 2}
        y={at[1] - h / 2}
        width={w}
        height={h}
        rx={8 * px}
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth={2 * px}
      />
      <text
        x={at[0]}
        y={at[1] + 6 * px}
        textAnchor="middle"
        fontSize={18 * px}
        fontFamily="var(--font-title)"
        fill="var(--ink)"
      >
        {text}
      </text>
    </g>
  )
}

function Pond({ ring }: { ring: readonly Vec2[] }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const inner = offsetRing(ring, -0.35)
  const [cx, cy] = ring.reduce(([sx, sy], [x, y]) => [sx + x / ring.length, sy + y / ring.length], [0, 0])
  return (
    <g filter={board.ink}>
      <path d={smoothClosedPath(ring)} fill="var(--water)" stroke="var(--ink)" strokeWidth={3 * px} />
      <path d={smoothClosedPath(inner)} fill="none" stroke="var(--sea-line)" strokeWidth={1.5 * px} />
      {[-0.7, 0.5].map((dy, i) => (
        <path
          key={i}
          d={`M${cx - 0.9 + i * 0.6},${cy + dy} q0.3,-0.3 0.6,0 t0.6,0`}
          fill="none"
          stroke="var(--sea-line)"
          strokeWidth={1.5 * px}
        />
      ))}
    </g>
  )
}

const PROP_ART: Record<Prop['kind'], string> = {
  treePines: art.treePines,
  treePine: art.treePine,
  rocksA: art.rocksA,
  well: art.well,
  bush: art.bush,
}

/** The park around the paths: meadow with trees, the pond, the gate and the castle. Static per walk. */
export const ParkScenery = memo(function ParkScenery({
  level,
  labels,
}: {
  level: WalkLevel
  labels: { start: string; goal: string }
}) {
  const props = useMemo(() => sceneryFor(level), [level])
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
      {level.pond && <Pond ring={level.pond} />}
      {props.map((p, i) => (
        <Icon key={i} href={PROP_ART[p.kind]} at={p.at} width={p.size} />
      ))}
      <Icon href={art.fence} at={GATE} width={2.2} />
      <Icon href={art.castle} at={CASTLE} width={3.4} />
      <MapLabel at={START_LABEL} text={labels.start} />
      <MapLabel at={GOAL_LABEL} text={labels.goal} />
    </g>
  )
})

/** The person's footpath (walked part darker) and the dog's dotted trail (walked part solid). */
export function Paths({ person, dog, s, t }: { person: Path; dog: Path; s: number; t: number }) {
  return (
    <>
      <PathLines person={person} dog={dog} />
      <WalkedPaths person={person} dog={dog} s={s} t={t} />
    </>
  )
}

/**
 * The static part of {@link Paths}: the footpath with its ink outline and the dog's dotted trail (for a
 * board's `under` layer, with {@link WalkedPaths} on the board).
 */
export const PathLines = memo(function PathLines({ person, dog }: { person: Path; dog: Path }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const width = Math.max(0.9, 16 * px)
  const all = polyline(person.points)
  return (
    <g pointerEvents="none" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <polyline points={all} stroke="var(--ink)" strokeWidth={width + 4 * px} filter={board.ink} />
      <polyline points={all} stroke="#f3e7c4" strokeWidth={width} />
      <polyline
        points={polyline(dog.points)}
        stroke="var(--ink-soft)"
        strokeWidth={3 * px}
        strokeDasharray={`${0.1 * px} ${9 * px}`}
      />
    </g>
  )
})

/** The walked parts of both paths, drawn over {@link PathLines}. */
export function WalkedPaths({ person, dog, s, t }: { person: Path; dog: Path; s: number; t: number }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const width = Math.max(0.9, 16 * px)
  return (
    <g pointerEvents="none" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {s > 0 && <polyline points={polyline(walkedPart(person, s))} stroke="#d9bf86" strokeWidth={width} />}
      {t > 0 && (
        <polyline points={polyline(walkedPart(dog, t))} stroke="var(--ink-soft)" strokeWidth={2.5 * px} />
      )}
    </g>
  )
}

/** The leash between person and dog: sagging while slack, straight and orange-red when nearly taut. */
export function Leash({
  from,
  to,
  length,
  taut,
  label,
  ghost = false,
}: {
  from: Vec2
  to: Vec2
  length: number
  taut: boolean
  label?: string
  ghost?: boolean
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const d = Math.hypot(to[0] - from[0], to[1] - from[1])
  const mid: Vec2 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  // Sag sideways by how much slack is left (top view: a loose leash curves).
  const sag = Math.min(1.2, Math.max(0, length - d) * 0.3)
  const nx = d > 0 ? -(to[1] - from[1]) / d : 0
  const ny = d > 0 ? (to[0] - from[0]) / d : 1
  const ctrl: Vec2 = [mid[0] + nx * sag * 2, mid[1] + ny * sag * 2]
  const colour = taut ? 'var(--warn)' : 'var(--ink)'
  return (
    <g pointerEvents="none" opacity={ghost ? 0.7 : 1}>
      <path
        d={`M${from[0]},${from[1]} Q${ctrl[0]},${ctrl[1]} ${to[0]},${to[1]}`}
        fill="none"
        stroke={colour}
        strokeWidth={(taut ? 4.5 : 3.5) * px}
        strokeLinecap="round"
        strokeDasharray={ghost ? `${8 * px} ${5 * px}` : undefined}
      />
      {/* The length beside the leash (away from its sag), once it is long enough not to cover the walkers. */}
      {label && d > 64 * px && (
        <LeashBadge at={[mid[0] - nx * 20 * px, mid[1] - ny * 20 * px]} text={label} taut={taut} />
      )}
    </g>
  )
}

function LeashBadge({ at, text, taut }: { at: Vec2; text: string; taut: boolean }) {
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

/** The person (green token) and the dog (dog.png), drawn in pixels so they stay large on small screens. */
export function Walkers({ person, dog, ghost = false }: { person: Vec2; dog: Vec2; ghost?: boolean }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const p = 34 * px
  const d = 40 * px
  return (
    <g pointerEvents="none" opacity={ghost ? 0.6 : 1} data-testid={ghost ? undefined : 'walkers'}>
      {/* The person on top: the smaller token stays visible when the dog is close. */}
      <Icon href={art.dog} at={dog} width={d} height={d * DOG_ASPECT} />
      <Icon href={art.person} at={person} width={p} />
    </g>
  )
}
