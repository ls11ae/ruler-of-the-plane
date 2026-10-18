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

/** An icon centred at a point, kept upright when the board is turned (and tilted by `tilt` degrees). */
function Icon({
  href,
  at,
  width,
  height,
  tilt = 0,
}: {
  href: string
  at: Vec2
  width: number
  height?: number
  tilt?: number
}) {
  const board = useBoard()
  const h = height ?? width
  const image = <image href={href} x={at[0] - width / 2} y={at[1] - h / 2} width={width} height={h} />
  return (
    <g transform={board.upright(at[0], at[1])}>
      {tilt ? <g transform={`rotate(${tilt.toFixed(2)} ${at[0]} ${at[1]})`}>{image}</g> : image}
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
  const board = useBoard()
  const px = board.pxToBoard(1)
  // About 0.9 m wide, but at least 16 px (whole park on a phone) and at most 24 px (camera zoomed in).
  const width = Math.min(Math.max(0.9, 16 * px), 24 * px)
  const all = polyline(person.points)
  return (
    <g pointerEvents="none" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <polyline points={all} stroke="var(--ink)" strokeWidth={width + 4 * px} filter={board.ink} />
      <polyline points={all} stroke="#f3e7c4" strokeWidth={width} />
      {s > 0 && <polyline points={polyline(walkedPart(person, s))} stroke="#d9bf86" strokeWidth={width} />}
      <polyline
        points={polyline(dog.points)}
        stroke="var(--ink-soft)"
        strokeWidth={3 * px}
        strokeDasharray={`${0.1 * px} ${9 * px}`}
      />
      {t > 0 && (
        <polyline points={polyline(walkedPart(dog, t))} stroke="var(--ink-soft)" strokeWidth={2.5 * px} />
      )}
    </g>
  )
}

/** Which way the leash pulls at each end (unit vectors along it) and how hard (0–1). */
export interface Pull {
  person: Vec2
  dog: Vec2
  strain: number
}

/**
 * The person (green token) and the dog (dog.png), drawn in pixels so they stay large on small screens.
 * When the leash is taut, the dog leans into it, pulling away, and the person leans back.
 */
export function Walkers({
  person,
  dog,
  ghost = false,
  pull,
}: {
  person: Vec2
  dog: Vec2
  ghost?: boolean
  pull?: Pull
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const p = 34 * px
  const d = 40 * px
  const strain = pull?.strain ?? 0
  // Screen x of a direction on the board (turned by 90° on a phone in portrait).
  const screenX = (v: Vec2) => (board.rotation === 90 ? -v[1] : v[0])
  const lean = (at: Vec2, along: Vec2 | undefined, shift: number, degrees: number) => {
    if (!along || strain === 0) return { at, tilt: 0 }
    const moved: Vec2 = [at[0] - along[0] * shift * px * strain, at[1] - along[1] * shift * px * strain]
    return { at: moved, tilt: -Math.sign(screenX(along)) * degrees * strain }
  }
  const dogLean = lean(dog, pull?.dog, 4, 16)
  const personLean = lean(person, pull?.person, 3, 12)
  return (
    <g pointerEvents="none" opacity={ghost ? 0.6 : 1} data-testid={ghost ? undefined : 'walkers'}>
      {/* The person on top: the smaller token stays visible when the dog is close. */}
      <Icon href={art.dog} at={dogLean.at} width={d} height={d * DOG_ASPECT} tilt={dogLean.tilt} />
      <Icon href={art.person} at={personLean.at} width={p} tilt={personLean.tilt} />
    </g>
  )
}
