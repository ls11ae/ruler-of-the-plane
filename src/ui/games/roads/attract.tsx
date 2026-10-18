import { useEffect, useMemo, useState } from 'react'
import { anglesAt, relax, type SteinerOptimum } from '../../../core/games/roads/junctions'
import { mapOf, type RoadsMap } from '../../../core/games/roads/levels'
import { kruskal, type Road } from '../../../core/games/roads/mst'
import type { Vec2 } from '../../../core/geometry/types'
import type { RoadsSteinerLevel } from '../../../core/levels/schema'
import { Board } from '../../components/Board'
import { useBoard } from '../../components/boardContext'
import { useAnimationFrame } from '../../input/hooks'
import { useLevel } from '../../levels'
import type { AttractProps } from '../registry'
import { CASTLE, VILLAGES } from './art'
import { Scenery } from './Scenery'

/** Maps of "Kreuzungen", one per round. */
const DEMO_MAPS = [
  'roads/steiner/2-viereck',
  'roads/steiner/4-leiter',
  'roads/steiner/3-zickzack',
  'roads/steiner/6-wabe',
  'roads/steiner/5-kette',
] as const

/** Timeline: a road per Kruskal step, then the junctions appear and slide to their Steiner points. */
const INTRO_MS = 800
/** Kruskal takes about this long on any map (each step between the two bounds below). */
const KRUSKAL_MS = 9000
const STEP_MS = { min: 900, max: 1800 }
const SWITCH_MS = 1400
const SLIDE_MS = 6000
const END_MS = 4500
const ROUNDS = 120

const arc = ([x, y]: Vec2, r: number, from: number, size: number) =>
  `M${x + r * Math.cos(from)},${y + r * Math.sin(from)}A${r},${r} 0 0 1 ${x + r * Math.cos(from + size)},${y + r * Math.sin(from + size)}`

/** Where the junctions start: amid their places and the middle of the map (as in the result animation). */
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
    return [x + 0.15 * Math.cos(k * 2.4), y + 0.15 * Math.sin(k * 2.4)]
  })
}

interface Line {
  a: Vec2
  b: Vec2
  tone: 'ink' | 'new' | 'refused' | 'ghost'
}

function Drawing({
  map,
  lines,
  junctions,
  arcs,
}: {
  map: RoadsMap
  lines: readonly Line[]
  junctions: readonly { at: Vec2; arcs: { from: number; size: number }[] }[]
  arcs: boolean
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const colour = {
    ink: 'var(--ink)',
    new: 'var(--person)',
    refused: 'var(--warn)',
    ghost: 'var(--ink-faint)',
  }
  return (
    <g pointerEvents="none">
      {lines.map(({ a, b, tone }, i) => (
        <line
          key={i}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          stroke={colour[tone]}
          strokeWidth={(tone === 'new' ? 5 : tone === 'ghost' ? 3 : 4) * px}
          strokeDasharray={`${10 * px} ${6 * px}`}
          strokeLinecap="round"
        />
      ))}
      {junctions.map(({ at, arcs: angles }, k) => (
        <g key={k}>
          {arcs &&
            angles.map(({ from, size }) => (
              <path
                key={from}
                d={arc(at, 20 * px, from, size)}
                fill="none"
                stroke="var(--person)"
                strokeWidth={3.5 * px}
              />
            ))}
          <circle
            cx={at[0]}
            cy={at[1]}
            r={8 * px}
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth={3 * px}
          />
        </g>
      ))}
      {map.points.map(([x, y], i) => {
        const size = 52 * px
        return (
          <g key={i} transform={board.upright(x, y)}>
            <image
              href={i >= map.villages ? CASTLE : VILLAGES[i % VILLAGES.length]}
              x={x - size / 2}
              y={y - size / 2}
              width={size}
              height={size}
            />
          </g>
        )
      })}
    </g>
  )
}

function Demo({ level, onDone }: { level: RoadsSteinerLevel; onDone: () => void }) {
  const map = useMemo(() => mapOf(level), [level])
  const { steps } = useMemo(() => kruskal(map.points), [map])
  const { optimum } = level
  // The junctions' way to their Steiner points, computed once (Weiszfeld rounds), ending exactly there.
  const frames = useMemo(() => {
    const start = startOf(map, optimum)
    const way = relax(map.points, { junctions: start, roads: [...optimum.roads] }, ROUNDS - 1)
    return [start, ...way.slice(0, -1), [...optimum.junctions]]
  }, [map, optimum])
  const stepMs = Math.min(STEP_MS.max, Math.max(STEP_MS.min, KRUSKAL_MS / steps.length))
  const switchAt = INTRO_MS + steps.length * stepMs
  const slideAt = switchAt + SWITCH_MS
  const total = slideAt + SLIDE_MS + END_MS

  const [start] = useState(() => performance.now())
  const [t, setT] = useState(0)
  useAnimationFrame((now) => setT(now - start), t < total)
  const over = t >= total
  useEffect(() => {
    if (over) onDone()
  }, [over, onDone])

  const p = map.points
  let lines: Line[]
  let junctions: { at: Vec2; arcs: { from: number; size: number }[] }[] = []
  let step: number
  const settled = t >= slideAt + SLIDE_MS
  if (t < switchAt) {
    // Kruskal: the roads by length; one that would close a ring flashes red and goes.
    const k = Math.floor((t - INTRO_MS) / stepMs)
    step = k + 1
    lines = steps.flatMap(({ road: [a, b], taken }, i): Line[] =>
      i > k || (!taken && i < k)
        ? []
        : [{ a: p[a]!, b: p[b]!, tone: i === k ? (taken ? 'new' : 'refused') : 'ink' }],
    )
  } else {
    const f = Math.min(1, Math.max(0, (t - slideAt) / SLIDE_MS))
    const frame = frames[Math.round((1 - (1 - f) ** 2) * (frames.length - 1))]!
    const nodes = [...p, ...frame]
    step = 100 + Math.round(f * 20)
    const mst = steps
      .filter((s) => s.taken)
      .map(({ road: [a, b] }): Line => ({ a: p[a]!, b: p[b]!, tone: 'ghost' }))
    lines = [
      ...mst,
      ...optimum.roads.map(([a, b]: Road): Line => ({ a: nodes[a]!, b: nodes[b]!, tone: 'ink' })),
    ]
    junctions = frame.map((at, k) => ({ at, arcs: anglesAt(nodes, optimum.roads, p.length + k) }))
  }
  return (
    <div data-step={step} style={{ width: '100%', height: '100%' }}>
      <Board bounds={map.bounds} padding={0.9} autoRotate>
        <Scenery map={map} />
        <Drawing map={map} lines={lines} junctions={junctions} arcs={settled} />
      </Board>
    </div>
  )
}

/**
 * Attract demo of "Straßenbau": on a map of "Kreuzungen" the computer first builds the shortest network
 * from place to place, road by road, the cheapest first (Kruskal); then junctions appear and slide to
 * their Steiner points, where three roads meet at 120°. A different map each round.
 */
export default function RoadsAttract({ round, onDone }: AttractProps) {
  const level = useLevel<RoadsSteinerLevel>(DEMO_MAPS[round % DEMO_MAPS.length]!)
  if (level.status !== 'ready') return null
  return <Demo level={level.value} onDone={onDone} />
}
