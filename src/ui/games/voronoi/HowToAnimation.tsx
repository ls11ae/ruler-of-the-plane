import { areaD, FillRule, intersectD } from 'clipper2-ts'
import { Delaunay } from 'd3-delaunay'
import type { Vec2 } from '../../../core/geometry/types'
import { PLAYER_COLOURS, ringPath } from './drawing'
import styles from './Voronoi.module.css'

const W = 300
const H = 170
/** A small island (y down). */
const ISLAND: Vec2[] = Array.from({ length: 48 }, (_, i) => {
  const a = (2 * Math.PI * i) / 48
  const r = 1 + 0.07 * Math.sin(3 * a + 0.5) + 0.05 * Math.sin(5 * a + 1.3)
  return [150 + 128 * r * Math.cos(a), 85 + 68 * r * Math.sin(a)] as const
})
const BEFORE: { at: Vec2; owner: 0 | 1 }[] = [
  { at: [95, 80], owner: 0 },
  { at: [200, 90], owner: 1 },
]
const NEW: { at: Vec2; owner: 0 | 1 } = { at: [205, 45], owner: 0 }

function voronoiCells(castles: readonly { at: Vec2 }[]): Vec2[][] {
  const v = Delaunay.from(castles.map((c) => [c.at[0], c.at[1]])).voronoi([0, 0, W, H])
  return castles.map((_, i) => (v.cellPolygon(i) ?? []) as Vec2[])
}

const CELLS_BEFORE = voronoiCells(BEFORE).map(ringPath)
const AFTER = voronoiCells([...BEFORE, NEW])
const CELLS_AFTER = AFTER.map(ringPath)
const asPath = (ring: readonly Vec2[]) => ring.map(([x, y]) => ({ x, y }))
/** Land points of the new castle: its share of the island in percent. */
const GAIN = Math.round(
  (100 *
    Math.abs(
      intersectD([asPath(ISLAND)], [asPath(AFTER[2]!)], FillRule.NonZero, 3).reduce(
        (s, p) => s + areaD(p),
        0,
      ),
    )) /
    Math.abs(areaD(asPath(ISLAND))),
)

function MiniCastle({ at, owner, className }: { at: Vec2; owner: 0 | 1; className?: string }) {
  const [x, y] = at
  return (
    <g className={className}>
      <ellipse
        cx={x}
        cy={y + 9}
        rx={13}
        ry={4.5}
        fill={PLAYER_COLOURS[owner]}
        stroke="var(--ink)"
        strokeWidth={1.5}
      />
      <path
        d={`M${x - 9},${y + 8} v-16 h4 v4 h3 v-4 h4 v4 h3 v-4 h4 v16 z`}
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <line x1={x} y1={y - 8} x2={x} y2={y - 19} stroke="var(--ink)" strokeWidth={1.5} />
      <path
        d={`M${x},${y - 19} l10,3 l-10,3 z`}
        fill={PLAYER_COLOURS[owner]}
        stroke="var(--ink)"
        strokeWidth={1}
      />
    </g>
  )
}

/** "So geht's": two castles share the island; a new blue castle takes a piece of orange's land. */
export function HowToAnimation({ label }: { label: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`${styles.animationSvg} ${styles.loop}`}
      role="img"
      aria-label={label}
    >
      <defs>
        <clipPath id="howto-island">
          <path d={ringPath(ISLAND)} />
        </clipPath>
      </defs>
      <path d={ringPath(ISLAND)} fill="var(--land-wash)" />
      <g clipPath="url(#howto-island)">
        <g className={styles.before}>
          {CELLS_BEFORE.map((d, i) => (
            <path
              key={i}
              d={d}
              fill={PLAYER_COLOURS[BEFORE[i]!.owner]}
              fillOpacity={0.35}
              stroke="var(--ink)"
              strokeDasharray="5 4"
              strokeWidth={1.3}
            />
          ))}
        </g>
        <g className={styles.after}>
          {CELLS_AFTER.map((d, i) => (
            <path
              key={i}
              d={d}
              fill={PLAYER_COLOURS[(i < BEFORE.length ? BEFORE[i]! : NEW).owner]}
              fillOpacity={0.35}
              stroke="var(--ink)"
              strokeDasharray="5 4"
              strokeWidth={1.3}
            />
          ))}
        </g>
        <path
          className={styles.ghostCell}
          d={CELLS_AFTER[2]}
          fill="none"
          stroke={PLAYER_COLOURS[0]}
          strokeWidth={3}
          strokeDasharray="7 4"
        />
      </g>
      <path
        d={ringPath(ISLAND)}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={3.5}
        strokeLinejoin="round"
        filter="url(#ink)"
      />
      {BEFORE.map((c, i) => (
        <MiniCastle key={i} at={c.at} owner={c.owner} />
      ))}
      <g className={styles.ghost}>
        <MiniCastle at={NEW.at} owner={NEW.owner} />
      </g>
      <g className={styles.gain}>
        <rect
          x={222}
          y={18}
          width={62}
          height={26}
          rx={6}
          fill="var(--paper)"
          stroke={PLAYER_COLOURS[0]}
          strokeWidth={2}
        />
        <text
          x={253}
          y={36}
          textAnchor="middle"
          fontSize={16}
          fontFamily="var(--font-text)"
          fill="var(--ink)"
        >
          +{GAIN}
        </text>
      </g>
    </svg>
  )
}
