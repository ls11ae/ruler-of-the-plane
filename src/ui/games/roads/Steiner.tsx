import { useMemo, useState } from 'react'
import {
  anglesAt,
  relax,
  type JunctionNetwork,
  type SteinerOptimum,
} from '../../../core/games/roads/junctions'
import { STEINER_HOW_TO, type RoadsMap } from '../../../core/games/roads/levels'
import type { Road } from '../../../core/games/roads/mst'
import type { Vec2 } from '../../../core/geometry/types'
import { Button } from '../../components/Button'
import { useAnimationFrame } from '../../input/hooks'
import { CASTLE, VILLAGES } from './art'
import styles from './Roads.module.css'
import type { RoadsTexts } from './i18n.de'
import { useMedia } from './useMedia'

const FRAME_MS = 40
const ROUNDS = 120
/** The how-to loop: roads appear, then the junction slides to its best spot (ms). */
const LOOP_MS = 6000

const svgArc = ([x, y]: Vec2, r: number, from: number, size: number) =>
  `M${x + r * Math.cos(from)},${y + r * Math.sin(from)}A${r},${r} 0 0 1 ${x + r * Math.cos(from + size)},${y + r * Math.sin(from + size)}`

/** Roads, places and junctions of a network, drawn without a board (animations). */
function Network({
  map,
  nodes,
  roads,
  unit,
  arcs,
}: {
  map: RoadsMap
  nodes: readonly Vec2[]
  roads: readonly Road[]
  /** One "pixel" in drawing units. */
  unit: number
  /** Draw the 120° arcs at the junctions (when they have settled). */
  arcs: boolean
}) {
  const places = map.points.length
  return (
    <>
      {roads.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={nodes[a]![0]}
          y1={nodes[a]![1]}
          x2={nodes[b]![0]}
          y2={nodes[b]![1]}
          stroke="var(--ink)"
          strokeWidth={unit * 3}
          strokeDasharray={`${unit * 8} ${unit * 5}`}
          strokeLinecap="round"
        />
      ))}
      {nodes.slice(places).map((j, k) => (
        <g key={k}>
          {arcs &&
            anglesAt(nodes, roads, places + k).map(({ from, size }) => (
              <path
                key={from}
                d={svgArc(j, unit * 16, from, size)}
                fill="none"
                stroke="var(--person)"
                strokeWidth={unit * 3}
              />
            ))}
          <circle
            cx={j[0]}
            cy={j[1]}
            r={unit * 7}
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth={unit * 2.5}
          />
        </g>
      ))}
      {map.points.map(([x, y], i) => {
        const size = unit * 46
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
    </>
  )
}

/** Where the animation's junctions start: at the middle of their places, or of all places. */
function startOf(map: RoadsMap, optimum: SteinerOptimum): Vec2[] {
  const n = map.points.length
  const mean = (ps: readonly Vec2[]): Vec2 => [
    ps.reduce((s, p) => s + p[0], 0) / ps.length,
    ps.reduce((s, p) => s + p[1], 0) / ps.length,
  ]
  const centre = mean(map.points)
  return optimum.junctions.map((_, k) => {
    const v = n + k
    const near = optimum.roads.flatMap(([a, b]) => (a === v && b < n ? [b] : b === v && a < n ? [a] : []))
    const [x, y] = near.length ? mean([...near.map((p) => map.points[p]!), centre]) : centre
    // Slightly apart, so no two junctions start on the same spot.
    return [x + 0.15 * Math.cos(k * 2.4), y + 0.15 * Math.sin(k * 2.4)]
  })
}

/**
 * "Was steckt dahinter?" for "Kreuzungen": the optimum's layout of roads, its junctions starting in the
 * middle of their places and moving, round by round, to the spot nearest to their neighbours (Weiszfeld
 * steps), until three roads meet at 120° everywhere; the length counts down meanwhile.
 */
export function SteinerAnimation({
  map,
  optimum,
  t,
}: {
  map: RoadsMap
  optimum: SteinerOptimum
  t: RoadsTexts
}) {
  const frames = useMemo(() => {
    const start: JunctionNetwork = { junctions: startOf(map, optimum), roads: [...optimum.roads] }
    return [start.junctions, ...relax(map.points, start, ROUNDS - 1).slice(0, -1), [...optimum.junctions]]
  }, [map, optimum])
  const still = useMedia('(prefers-reduced-motion: reduce)')
  const [begin, setBegin] = useState(() => performance.now())
  const [k, setK] = useState(0)
  const last = frames.length - 1
  const shown = still ? last : k
  useAnimationFrame(
    (now) => setK(Math.min(last, Math.max(0, Math.floor((now - begin) / FRAME_MS)))),
    !still && k < last,
  )
  const nodes = [...map.points, ...frames[shown]!]
  const length = optimum.roads.reduce(
    (s, [a, b]) => s + Math.hypot(nodes[a]![0] - nodes[b]![0], nodes[a]![1] - nodes[b]![1]),
    0,
  )
  const { minX, minY, maxX, maxY } = map.bounds
  const pad = 0.5
  const w = maxX - minX + 2 * pad
  const unit = w / 360
  return (
    <div>
      <svg
        viewBox={`${minX - pad} ${minY - pad} ${w} ${maxY - minY + 2 * pad}`}
        className={styles.animationSvg}
        role="img"
        aria-label={t.steiner.animation}
      >
        <Network map={map} nodes={nodes} roads={optimum.roads} unit={unit} arcs={shown === last} />
      </svg>
      <p className={styles.animationCaption} data-testid="steiner-animation-length">
        {t.length(length)}
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

const HOW_TO_MAP = STEINER_HOW_TO
const HOW_TO_ROADS: Road[] = [
  [0, 3],
  [1, 3],
  [2, 3],
]
const HOW_TO_FROM: Vec2 = [0.9, 0.3]
/** Where the junction comes to rest: where its three roads meet at 120°. */
const HOW_TO_BEST = relax(HOW_TO_MAP.points, { junctions: [HOW_TO_FROM], roads: HOW_TO_ROADS }, 200).at(
  -1,
)![0]!

/** "So geht's" of "Kreuzungen": three roads appear at a junction, which then slides to its best spot. */
export function SteinerHowTo({ label }: { label: string }) {
  const still = useMedia('(prefers-reduced-motion: reduce)')
  const [now, setNow] = useState(() => performance.now())
  const [begin] = useState(now)
  useAnimationFrame((time) => setNow(time), !still)
  const time = still ? LOOP_MS : Math.max(0, now - begin) % LOOP_MS
  // 0–30 %: the roads appear one by one; 35–75 %: the junction slides; then it rests at its best spot.
  const roads = HOW_TO_ROADS.slice(0, still ? 3 : Math.min(3, Math.floor(time / (0.1 * LOOP_MS)) + 1))
  const slide = Math.min(1, Math.max(0, (time / LOOP_MS - 0.35) / 0.4))
  const eased = slide * slide * (3 - 2 * slide)
  const [from, to] = [HOW_TO_FROM, HOW_TO_BEST]
  const junction: Vec2 = [from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased]
  const unit = 4.2 / 340
  return (
    <svg viewBox="-2.1 -2 4.2 3.4" className={styles.animationSvg} role="img" aria-label={label}>
      <Network
        map={HOW_TO_MAP}
        nodes={[...HOW_TO_MAP.points, junction]}
        roads={roads}
        unit={unit}
        arcs={slide >= 1}
      />
    </svg>
  )
}

/** Theory beside the map: the 120° rule, the comparison without junctions, Gilbert–Pollak, NP-hardness. */
export function SteinerTheory({
  mstLength,
  optimum,
  show,
  setShow,
  t,
  onClose,
}: {
  mstLength: number
  optimum: SteinerOptimum
  show: 'mst' | 'optimum' | null
  setShow: (show: 'mst' | 'optimum' | null) => void
  t: RoadsTexts
  onClose: () => void
}) {
  const percent = ((mstLength / optimum.length - 1) * 100).toFixed(1)
  return (
    <aside className={styles.theory} aria-label={t.theory.title}>
      <div className={styles.theoryHead}>
        <h2>{t.theory.title}</h2>
        <Button small onClick={onClose} aria-label={t.theory.close}>
          ×
        </Button>
      </div>
      <p>{t.steiner.theory.rule}</p>
      <div className={styles.toggles}>
        {(['mst', 'optimum'] as const).map((s) => (
          <Button
            key={s}
            small
            selected={show === s}
            aria-pressed={show === s}
            onClick={() => setShow(show === s ? null : s)}
          >
            {s === 'mst' ? t.steiner.theory.showMst : t.steiner.theory.showOptimum}
          </Button>
        ))}
      </div>
      <p data-testid="steiner-compare">
        {t.steiner.theory.compare(t.km(mstLength), t.km(optimum.length), percent)}
      </p>
      <p>{t.steiner.theory.bound}</p>
      <p>{t.steiner.theory.hard}</p>
    </aside>
  )
}
