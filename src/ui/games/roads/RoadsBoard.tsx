import { useState } from 'react'
import { normalise, roadKey, type Road } from '../../../core/games/roads/mst'
import type { RoadsMap } from '../../../core/games/roads/levels'
import type { Vec2 } from '../../../core/geometry/types'
import { useBoard } from '../../components/boardContext'
import { usePointerGesture } from '../../input/hooks'
import { CASTLE, VILLAGES } from './art'

/** Settlement icons and their hit targets, in screen pixels (at least 44 px to tap). */
const ICON_PX = 66
const HIT_PX = 28
/** A road is hit within this distance (pixels) of its line. */
const ROAD_HIT_PX = 12

const segmentDistance = (p: Vec2, a: Vec2, b: Vec2) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1])
}

export type Highlight = { road: Road; tone: 'bad' | 'good' } | null

/** The mark in the middle of a marked road, so it does not depend on the colour: a cross or a plus. */
function RoadMark({ at, tone }: { at: Vec2; tone: 'bad' | 'good' }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const [x, y] = at
  const arm = 5 * px
  const d =
    tone === 'bad'
      ? `M${x - arm},${y - arm}L${x + arm},${y + arm}M${x + arm},${y - arm}L${x - arm},${y + arm}`
      : `M${x - arm * 1.2},${y}L${x + arm * 1.2},${y}M${x},${y - arm * 1.2}L${x},${y + arm * 1.2}`
  return (
    <g data-mark={tone}>
      <circle
        cx={x}
        cy={y}
        r={11 * px}
        fill="var(--paper)"
        stroke={tone === 'bad' ? 'var(--warn)' : 'var(--person)'}
        strokeWidth={3 * px}
      />
      <path d={d} stroke="var(--ink)" strokeWidth={2.6 * px} strokeLinecap="round" />
    </g>
  )
}

/**
 * A road drawn as a dashed ink line (the style of the start map). A marked road is red with a cross
 * (can go) or green with a plus (to build).
 */
function RoadLine({
  a,
  b,
  tone,
  ghost,
  mark = !ghost,
}: {
  a: Vec2
  b: Vec2
  tone?: 'bad' | 'good'
  ghost?: boolean
  /** The cross or plus in the middle (default: on marked roads that are not faint). */
  mark?: boolean
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const colour = tone === 'bad' ? 'var(--warn)' : tone === 'good' ? 'var(--person)' : 'var(--ink)'
  return (
    <g pointerEvents="none">
      {tone && (
        <line
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          stroke={colour}
          strokeOpacity={0.3}
          strokeWidth={14 * px}
          strokeLinecap="round"
        />
      )}
      <line
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke={colour}
        strokeOpacity={ghost ? 0.55 : 1}
        strokeWidth={(tone ? 4.5 : 3.5) * px}
        strokeLinecap="round"
        strokeDasharray={`${10 * px} ${7 * px}`}
      />
      {tone && mark && <RoadMark at={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]} tone={tone} />}
    </g>
  )
}

/** A village or castle, kept upright on a turned board; a selected one gets a ring. */
function Settlement({
  at,
  index,
  castle,
  selected,
}: {
  at: Vec2
  index: number
  castle: boolean
  selected: boolean
}) {
  const board = useBoard()
  const s = board.pxToBoard(ICON_PX)
  return (
    <g transform={board.upright(at[0], at[1])} pointerEvents="none">
      <circle
        cx={at[0]}
        cy={at[1]}
        r={s * 0.4}
        fill={selected ? 'var(--light-soft)' : 'rgb(251 248 240 / 55%)'}
        stroke={selected ? 'var(--ink)' : 'none'}
        strokeWidth={board.pxToBoard(2.5)}
        strokeDasharray={selected ? `${board.pxToBoard(5)} ${board.pxToBoard(4)}` : undefined}
      />
      <image
        href={castle ? CASTLE : VILLAGES[index % VILLAGES.length]}
        x={at[0] - s / 2}
        y={at[1] - s / 2}
        width={s}
        height={s}
      />
    </g>
  )
}

interface RoadsLayerProps {
  map: RoadsMap
  roads: readonly Road[]
  highlight: Highlight
  /** Roads drawn faintly on top (the theory view's Kruskal steps): taken green, skipped red. */
  overlay?: { road: Road; taken: boolean; current: boolean }[]
  onBuild(road: Road): void
  onRemove(road: Road): void
}

/**
 * The map: settlements, the player's roads, and pointer input. Dragging from a settlement to another
 * builds a road; tapping two settlements one after the other does too; tapping a road removes it.
 */
export function RoadsLayer({ map, roads, highlight, overlay, onBuild, onRemove }: RoadsLayerProps) {
  const board = useBoard()
  const { points } = map
  const [from, setFrom] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [pointer, setPointer] = useState<Vec2 | null>(null)
  const [hoverRoad, setHoverRoad] = useState<string | null>(null)

  const settlementAt = (p: Vec2): number | null => {
    let best: number | null = null
    let bestD = board.pxToBoard(HIT_PX)
    points.forEach((q, i) => {
      const d = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (d <= bestD) {
        best = i
        bestD = d
      }
    })
    return best
  }
  const roadAt = (p: Vec2): Road | null => {
    let best: Road | null = null
    let bestD = board.pxToBoard(ROAD_HIT_PX)
    for (const r of roads) {
      const d = segmentDistance(p, points[r[0]]!, points[r[1]]!)
      if (d <= bestD) {
        best = r
        bestD = d
      }
    }
    return best
  }
  const at = (e: React.PointerEvent): Vec2 => board.toBoard(e.clientX, e.clientY)
  const build = (a: number, b: number) => {
    if (a !== b) onBuild(normalise(a, b))
  }

  const gesture = usePointerGesture(
    {
      onPress: (e) => {
        const p = at(e)
        setFrom(settlementAt(p))
        setPointer(p)
      },
      onDragMove: (e) => setPointer(at(e)),
      onDragEnd: (e) => {
        const target = settlementAt(at(e))
        if (from !== null && target !== null) build(from, target)
        setFrom(null)
        setPointer(null)
        setSelected(null)
      },
      onTap: (e) => {
        const p = at(e)
        const s = settlementAt(p)
        setFrom(null)
        setPointer(null)
        if (s !== null) {
          if (selected === null || selected === s) setSelected(selected === s ? null : s)
          else {
            build(selected, s)
            setSelected(null)
          }
          return
        }
        const r = roadAt(p)
        if (r) onRemove(r)
        setSelected(null)
      },
    },
    // No long press: a slow tap on a settlement still selects it.
    { dragThreshold: 8, longPressMs: 1e9 },
  )

  const target = pointer ? settlementAt(pointer) : null
  const previewEnd = target !== null && target !== from ? points[target]! : pointer
  const { minX, minY, maxX, maxY } = map.bounds
  const pad = 1
  return (
    <g>
      {roads.map((r) => {
        const key = roadKey(r)
        const tone =
          highlight && roadKey(highlight.road) === key
            ? highlight.tone
            : hoverRoad === key
              ? 'bad'
              : undefined
        return <RoadLine key={key} a={points[r[0]]!} b={points[r[1]]!} tone={tone} />
      })}
      {highlight && highlight.tone === 'good' && (
        <RoadLine a={points[highlight.road[0]]!} b={points[highlight.road[1]]!} tone="good" ghost mark />
      )}
      {overlay?.map(({ road, taken, current }) => (
        <RoadLine
          key={`k${roadKey(road)}`}
          a={points[road[0]]!}
          b={points[road[1]]!}
          tone={current ? (taken ? 'good' : 'bad') : taken ? 'good' : undefined}
          ghost={!current}
        />
      ))}
      {from !== null && previewEnd && <RoadLine a={points[from]!} b={previewEnd} ghost />}
      {points.map((p, i) => (
        <Settlement
          key={i}
          at={p}
          index={i}
          castle={i >= map.villages}
          selected={i === selected || i === from}
        />
      ))}
      <rect
        x={minX - pad}
        y={minY - pad}
        width={maxX - minX + 2 * pad}
        height={maxY - minY + 2 * pad}
        fill="transparent"
        data-testid="roads-input"
        style={{ cursor: from !== null ? 'grabbing' : 'pointer' }}
        {...gesture}
        onPointerMove={(e) => {
          gesture.onPointerMove(e)
          if (e.pointerType === 'mouse' && from === null) {
            const p = at(e)
            const r = settlementAt(p) === null ? roadAt(p) : null
            setHoverRoad(r ? roadKey(r) : null)
          }
        }}
        onPointerLeave={() => setHoverRoad(null)}
      />
    </g>
  )
}
