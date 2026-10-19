import { useId, useMemo, useState } from 'react'
import { fisk } from '../../../core/games/art-gallery/triangulation'
import { visibilityPolygon } from '../../../core/games/art-gallery/visibility'
import type { Vec2 } from '../../../core/geometry/types'
import type { ArtGalleryLevel } from '../../../core/levels/schema'
import { Button } from '../../components/Button'
import { useAnimationFrame } from '../../input/hooks'
import styles from './Animations.module.css'
import { diagonals, FISK_COLOURS } from './fiskDrawing'
import { floorPath, ringPath } from './paths'
import rock from './rock.svg'
import { ROCK_COLOUR } from './art'

export function CornerMark({ at, colour, size }: { at: Vec2; colour: number; size: number }) {
  const [x, y] = at
  const fill = FISK_COLOURS[colour]
  const stroke = { stroke: 'var(--ink)', strokeWidth: size * 0.22 }
  if (colour === 0) return <circle cx={x} cy={y} r={size} fill={fill} {...stroke} />
  if (colour === 1)
    return <rect x={x - size} y={y - size} width={2 * size} height={2 * size} fill={fill} {...stroke} />
  return (
    <path
      d={`M${x},${y - size * 1.2} L${x + size * 1.1},${y + size * 0.8} L${x - size * 1.1},${y + size * 0.8} Z`}
      fill={fill}
      {...stroke}
      strokeLinejoin="round"
    />
  )
}

function viewBoxOf(level: ArtGalleryLevel, pad = 0.4) {
  const { minX, minY, maxX, maxY } = level.bounds
  return `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`
}

/** The rock of the board around the dungeon and in its pillars (one tile is a quarter of the level). */
function Rock({ level, pad = 0.4 }: { level: ArtGalleryLevel; pad?: number }) {
  const id = useId().replace(/[^\w-]/g, '')
  const { minX, minY, maxX, maxY } = level.bounds
  const tile = Math.max(maxX - minX, maxY - minY) / 4
  return (
    <>
      <defs>
        <pattern id={`rock-${id}`} patternUnits="userSpaceOnUse" width={tile} height={tile}>
          <rect width={tile} height={tile} fill={ROCK_COLOUR} />
          <image href={rock} width={tile} height={tile} />
        </pattern>
      </defs>
      <rect
        x={minX - pad}
        y={minY - pad}
        width={maxX - minX + 2 * pad}
        height={maxY - minY + 2 * pad}
        fill={`url(#rock-${id})`}
      />
    </>
  )
}

/**
 * Fisk's proof on a dungeon without pillars: the diagonals of a triangulation appear, the corners get
 * three colours (every triangle has each colour once), and the rarest colour is marked: torches there
 * see every triangle.
 */
export function FiskAnimation({
  level,
  label,
  replay,
}: {
  level: ArtGalleryLevel
  label: string
  replay: string
}) {
  const [run, setRun] = useState(0)
  const proof = useMemo(() => fisk(level), [level])
  if (!proof) return null
  const { triangulation, colours, guards } = proof
  const lines = diagonals(level, triangulation.triangles, triangulation.points)
  const edgeStep = 1800 / Math.max(1, lines.length)
  const cornerStart = 2100
  const cornerStep = 1400 / Math.max(1, colours.length)
  const guardStart = cornerStart + 1700
  const s = Math.max(level.bounds.maxX - level.bounds.minX, level.bounds.maxY - level.bounds.minY) / 100
  return (
    <div>
      <svg key={run} viewBox={viewBoxOf(level)} className={styles.svg} role="img" aria-label={label}>
        <Rock level={level} />
        <path d={floorPath(level)} fill="var(--paper)" fillRule="evenodd" />
        {lines.map(([a, b], i) => (
          <line
            key={i}
            className={styles.edge}
            style={{ animationDelay: `${i * edgeStep}ms` }}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke="var(--ink-soft)"
            strokeWidth={s * 0.5}
            strokeDasharray={`${s * 1.5} ${s}`}
          />
        ))}
        <path
          d={floorPath(level)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={s * 1.2}
          strokeLinejoin="round"
        />
        {guards.map((g) => (
          <circle
            key={`g${g}`}
            className={styles.guard}
            style={{ animationDelay: `${guardStart}ms` }}
            cx={triangulation.points[g]![0]}
            cy={triangulation.points[g]![1]}
            r={s * 4.2}
            fill="var(--light)"
            fillOpacity={0.55}
            stroke="var(--ink)"
            strokeWidth={s * 0.6}
          />
        ))}
        {triangulation.points.map((p, i) => (
          <g
            key={i}
            className={styles.corner}
            style={{ animationDelay: `${cornerStart + i * cornerStep}ms` }}
          >
            <CornerMark at={p} colour={colours[i]!} size={s * 1.6} />
          </g>
        ))}
      </svg>
      <Button small className={styles.replay} onClick={() => setRun((r) => r + 1)}>
        {replay}
      </Button>
    </div>
  )
}

/** Where the ray from q in direction (dx, dy) leaves the polygon. */
function rayExit(q: Vec2, dx: number, dy: number, poly: readonly Vec2[]): Vec2 {
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const denom = dx * ey - dy * ex
    if (Math.abs(denom) < 1e-15) continue
    const t = ((a[0] - q[0]) * ey - (a[1] - q[1]) * ex) / denom
    const u = ((a[0] - q[0]) * dy - (a[1] - q[1]) * dx) / denom
    if (t > 1e-12 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t
  }
  return best === Infinity ? q : [q[0] + best * dx, q[1] + best * dy]
}

const SWEEP_MS = 4200

/**
 * How the computer checks the torches: a ray turns once around the first torch and reveals its
 * visibility polygon; then all torches' polygons light the dungeon.
 */
export function SweepAnimation({
  level,
  torches,
  label,
  replay,
}: {
  level: ArtGalleryLevel
  torches: readonly Vec2[]
  label: string
  replay: string
}) {
  const polys = useMemo(() => torches.map((t) => visibilityPolygon(level, t)), [level, torches])
  const [start, setStart] = useState(() => performance.now())
  const [angle, setAngle] = useState(0)
  const done = angle >= 2 * Math.PI
  useAnimationFrame(
    (now) => setAngle(Math.min(2 * Math.PI + 0.01, ((now - start) / SWEEP_MS) * 2 * Math.PI)),
    !done,
  )
  const q = torches[0]
  const first = polys[0]
  if (!q || !first) return null
  const s = Math.max(level.bounds.maxX - level.bounds.minX, level.bounds.maxY - level.bounds.minY) / 100
  const R = 40 * s * 100
  const end: Vec2 = [q[0] + Math.cos(angle), q[1] + Math.sin(angle)]
  const hit = rayExit(q, end[0] - q[0], end[1] - q[1], first)
  const wedge = `M${q[0]},${q[1]} L${q[0] + R},${q[1]} A${R},${R} 0 ${angle > Math.PI ? 1 : 0} 1 ${q[0] + R * Math.cos(angle)},${q[1] + R * Math.sin(angle)} Z`
  return (
    <div>
      <svg viewBox={viewBoxOf(level)} className={styles.svg} role="img" aria-label={label}>
        <defs>
          <clipPath id="sweep-wedge">
            <path d={done ? `M${q[0] - R},${q[1] - R}h${2 * R}v${2 * R}h${-2 * R}Z` : wedge} />
          </clipPath>
        </defs>
        <Rock level={level} />
        <path d={floorPath(level)} fill="var(--paper)" fillRule="evenodd" />
        <path d={floorPath(level)} fill="var(--dark)" fillOpacity={0.85} fillRule="evenodd" />
        {done &&
          polys.slice(1).map((p, i) => <path key={i} d={ringPath(p)} fill="#ffe7a0" fillOpacity={0.9} />)}
        <path d={ringPath(first)} fill="#ffd970" clipPath="url(#sweep-wedge)" />
        {!done && (
          <line x1={q[0]} y1={q[1]} x2={hit[0]} y2={hit[1]} stroke="var(--warn)" strokeWidth={s * 0.9} />
        )}
        <path
          d={floorPath(level)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={s * 1.2}
          strokeLinejoin="round"
        />
        {torches.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={s * 2.2}
            fill="var(--light)"
            stroke="var(--ink)"
            strokeWidth={s * 0.6}
          />
        ))}
      </svg>
      <Button
        small
        className={styles.replay}
        onClick={() => {
          setStart(performance.now())
          setAngle(0)
        }}
      >
        {replay}
      </Button>
    </div>
  )
}
