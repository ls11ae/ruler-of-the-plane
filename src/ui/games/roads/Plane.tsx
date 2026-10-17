import { useMemo, useState } from 'react'
import type { RoadsMap } from '../../../core/games/roads/levels'
import { networkLength, roadKey, type Road } from '../../../core/games/roads/mst'
import { crossings } from '../../../core/games/roads/plane'
import type { Vec2 } from '../../../core/geometry/types'
import { Button } from '../../components/Button'
import { useAnimationFrame } from '../../input/hooks'
import { CASTLE, VILLAGES } from './art'
import styles from './Roads.module.css'
import type { RoadsTexts } from './i18n.de'
import { useMedia } from './useMedia'

const STEP_MS = 550
/** The how-to loop (ms). */
const LOOP_MS = 6500

/** A crossing: a red ring with a cross (drawn without a board; `unit` is one pixel in drawing units). */
function CrossingMark({ at: [x, y], unit }: { at: Vec2; unit: number }) {
  const arm = 4.5 * unit
  return (
    <g data-mark="bad">
      <circle cx={x} cy={y} r={10 * unit} fill="var(--paper)" stroke="var(--warn)" strokeWidth={3 * unit} />
      <path
        d={`M${x - arm},${y - arm}L${x + arm},${y + arm}M${x + arm},${y - arm}L${x - arm},${y + arm}`}
        stroke="var(--ink)"
        strokeWidth={2.4 * unit}
        strokeLinecap="round"
      />
    </g>
  )
}

/** Places and roads without a board; roads that cross are red and their crossings marked. */
function Sketch({
  map,
  roads,
  unit,
  faint = [],
}: {
  map: RoadsMap
  roads: readonly Road[]
  unit: number
  /** Roads drawn faintly (on their way out). */
  faint?: readonly Road[]
}) {
  const { points } = map
  const found = crossings(points, roads)
  const bad = new Set(found.flatMap((c) => c.roads.map(roadKey)))
  return (
    <>
      {[...faint.map((r) => ({ r, faint: true })), ...roads.map((r) => ({ r, faint: false }))].map(
        ({ r, faint }) => (
          <line
            key={`${faint ? 'f' : ''}${roadKey(r)}`}
            x1={points[r[0]]![0]}
            y1={points[r[0]]![1]}
            x2={points[r[1]]![0]}
            y2={points[r[1]]![1]}
            stroke={bad.has(roadKey(r)) || faint ? 'var(--warn)' : 'var(--ink)'}
            strokeOpacity={faint ? 0.35 : 1}
            strokeWidth={unit * 3}
            strokeDasharray={`${unit * 8} ${unit * 5}`}
            strokeLinecap="round"
          />
        ),
      )}
      {points.map(([x, y], i) => {
        const size = unit * 42
        return (
          <image
            key={i}
            href={i >= map.villages ? CASTLE : VILLAGES[i % VILLAGES.length]}
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
          />
        )
      })}
      {found.map((c) => (
        <CrossingMark key={`${roadKey(c.roads[0])}x${roadKey(c.roads[1])}`} at={c.at} unit={unit} />
      ))}
    </>
  )
}

function viewOf(map: RoadsMap) {
  const { minX, minY, maxX, maxY } = map.bounds
  const pad = 0.5
  const w = maxX - minX + 2 * pad
  return { viewBox: `${minX - pad} ${minY - pad} ${w} ${maxY - minY + 2 * pad}`, w }
}

/**
 * "Was steckt dahinter?" for "Zwei Sorten": Kruskal without the crossing rule builds the castle–village
 * roads shortest first, and its crossings appear; then the roads that cross fade, and the shortest
 * network without crossings takes their place.
 */
export function PlaneAnimation({
  map,
  free,
  optimum,
  t,
}: {
  map: RoadsMap
  /** The tree without the crossing rule, in Kruskal's order. */
  free: readonly Road[]
  optimum: readonly Road[]
  t: RoadsTexts
}) {
  const still = useMedia('(prefers-reduced-motion: reduce)')
  const [begin, setBegin] = useState(() => performance.now())
  const [k, setK] = useState(0)
  // Steps 1…F: Kruskal's roads; two steps to look at the crossings; then the optimum.
  const last = free.length + 3
  const shown = still ? last : k
  useAnimationFrame(
    (now) => setK(Math.min(last, Math.max(0, Math.floor((now - begin) / STEP_MS)))),
    !still && k < last,
  )
  const final = shown >= last
  const roads = final ? optimum : free.slice(0, shown)
  const keys = new Set(optimum.map(roadKey))
  const { viewBox, w } = viewOf(map)
  const caption = final
    ? t.plane.animationBest(t.km(networkLength(map.points, optimum)))
    : shown >= free.length
      ? t.plane.animationFree(t.km(networkLength(map.points, free)), crossings(map.points, free).length)
      : ''
  return (
    <div>
      <svg viewBox={viewBox} className={styles.animationSvg} role="img" aria-label={t.plane.animation}>
        <Sketch
          map={map}
          roads={roads}
          unit={w / 360}
          faint={final ? free.filter((r) => !keys.has(roadKey(r))) : []}
        />
      </svg>
      <p className={styles.animationCaption} data-testid="plane-animation-caption">
        {caption || ' '}
      </p>
      <Button
        small
        onClick={() => {
          setBegin(performance.now())
          setK(0)
        }}
      >
        {t.replay}
      </Button>
    </div>
  )
}

/** "So geht's" of "Zwei Sorten": two castles, three villages; a road that crosses is replaced. */
const HOW_TO_MAP: RoadsMap = {
  points: [
    [40, 50],
    [200, 40],
    [310, 60],
    [90, 130],
    [250, 130],
  ],
  villages: 3,
  bounds: { minX: 40, minY: 40, maxX: 310, maxY: 130 },
}
const HOW_TO_GOOD: Road[] = [
  [0, 3],
  [1, 3],
  [2, 4],
]
const HOW_TO_BAD: Road = [0, 4]
const HOW_TO_FIX: Road = [1, 4]

export function PlaneHowTo({ label, done }: { label: string; done: string }) {
  const still = useMedia('(prefers-reduced-motion: reduce)')
  const [now, setNow] = useState(() => performance.now())
  const [begin] = useState(now)
  useAnimationFrame((time) => setNow(time), !still)
  const f = still ? 1 : (Math.max(0, now - begin) % LOOP_MS) / LOOP_MS
  const roads = useMemo(() => {
    const out = HOW_TO_GOOD.filter((_, i) => f >= 0.08 + 0.12 * i)
    if (f >= 0.44 && f < 0.66) out.push(HOW_TO_BAD)
    if (f >= 0.7) out.push(HOW_TO_FIX)
    return out
  }, [f])
  return (
    <svg viewBox="0 0 340 175" className={styles.animationSvg} role="img" aria-label={label}>
      <Sketch map={HOW_TO_MAP} roads={roads} unit={1} />
      {f >= 0.78 && f < 0.97 && (
        <g>
          <rect
            x={120}
            y={146}
            width={100}
            height={26}
            rx={8}
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth={2}
          />
          <text
            x={170}
            y={165}
            textAnchor="middle"
            fontSize={17}
            fontFamily="var(--font-text)"
            fill="var(--ink)"
          >
            {done}
          </text>
        </g>
      )}
    </svg>
  )
}

/**
 * Theory beside the map: the tree without the crossing rule with its crossings, next to the player's
 * network; why the problem is hard, the greedy strategy, and the open question of the factor.
 */
export function PlaneTheory({
  map,
  roads,
  free,
  greedyLength,
  t,
  onClose,
}: {
  map: RoadsMap
  roads: readonly Road[]
  free: readonly Road[]
  greedyLength: number
  t: RoadsTexts
  onClose: () => void
}) {
  const { viewBox, w } = viewOf(map)
  const freeCrossings = crossings(map.points, free).length
  return (
    <aside className={styles.theory} aria-label={t.theory.title}>
      <div className={styles.theoryHead}>
        <h2>{t.theory.title}</h2>
        <Button small onClick={onClose} aria-label={t.theory.close}>
          ×
        </Button>
      </div>
      <div className={styles.sketches}>
        <figure>
          <svg viewBox={viewBox} aria-hidden="true" data-testid="plane-free">
            <Sketch map={map} roads={free} unit={w / 210} />
          </svg>
          <figcaption>
            {t.plane.theory.freeTitle} · {t.km(networkLength(map.points, free))}
          </figcaption>
        </figure>
        <figure>
          <svg viewBox={viewBox} aria-hidden="true">
            <Sketch map={map} roads={roads} unit={w / 210} />
          </svg>
          <figcaption>
            {t.plane.theory.mineTitle} · {t.km(networkLength(map.points, roads))}
          </figcaption>
        </figure>
      </div>
      <p>{t.plane.theory.free(t.km(networkLength(map.points, free)), freeCrossings)}</p>
      <p>{t.plane.theory.hard}</p>
      <p>{t.plane.theory.greedy(t.km(greedyLength))}</p>
      <p>{t.plane.theory.open}</p>
    </aside>
  )
}
