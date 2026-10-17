import { useRef, useState } from 'react'
import { anglesAt, toDegrees } from '../../../core/games/roads/junctions'
import { normalise, roadKey, type Road } from '../../../core/games/roads/mst'
import type { RoadsMap } from '../../../core/games/roads/levels'
import type { Vec2 } from '../../../core/geometry/types'
import { useBoard } from '../../components/boardContext'
import { usePointerGesture } from '../../input/hooks'
import { CASTLE, VILLAGES } from './art'

/** Settlement icons and their hit targets, in screen pixels (at least 44 px to tap). */
const ICON_PX = 66
const HIT_PX = 28
/** Junctions: drawn radius and hit target (pixels). */
const JUNCTION_PX = 9
const JUNCTION_HIT_PX = 24
/** A road is hit within this distance (pixels) of its line. */
const ROAD_HIT_PX = 12
/** Junctions stay this far (level units) around the places' bounding box. */
const LAND_PAD = 0.6

const segmentDistance = (p: Vec2, a: Vec2, b: Vec2) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1])
}

type Tone = 'bad' | 'good'

/**
 * A marked part of the network: a road (red with a cross: can go; green with a plus: to build), a
 * junction (red ring with a cross: can go; green ring: move it), or a junction to build (a ghost with a
 * road to it from node `from`).
 */
export type Highlight =
  { road: Road; tone: Tone } | { node: number; tone: Tone } | { at: Vec2; from: number; tone: 'good' } | null

/** A line drawn on top of the network (the theory view): its ends, colour and whether it is faint. */
export interface Segment {
  key: string
  a: Vec2
  b: Vec2
  tone?: Tone
  ghost?: boolean
}

/** The mark of a marked road or a crossing, so it does not depend on the colour: a cross or a plus. */
export function RoadMark({ at, tone }: { at: Vec2; tone: Tone }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const [x, y] = at
  const arm = 5 * px
  const d =
    tone === 'bad'
      ? `M${x - arm},${y - arm}L${x + arm},${y + arm}M${x + arm},${y - arm}L${x - arm},${y + arm}`
      : `M${x - arm * 1.2},${y}L${x + arm * 1.2},${y}M${x},${y - arm * 1.2}L${x},${y + arm * 1.2}`
  return (
    <g data-mark={tone} pointerEvents="none">
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
 * Where two roads cross ("Zwei Sorten"): a red ring around the point, with an ink ring around it for
 * contrast (a ring, not a cross: the cross marks the road a hint means). `unit` is one pixel.
 */
export function CrossingRing({ at: [x, y], unit }: { at: Vec2; unit: number }) {
  return (
    <g data-mark="crossing" pointerEvents="none">
      <circle
        cx={x}
        cy={y}
        r={12 * unit}
        fill="var(--paper)"
        fillOpacity={0.45}
        stroke="var(--warn)"
        strokeWidth={4 * unit}
      />
      <circle cx={x} cy={y} r={14.5 * unit} fill="none" stroke="var(--ink)" strokeWidth={1.5 * unit} />
    </g>
  )
}

const toneColour = (tone?: Tone) =>
  tone === 'bad' ? 'var(--warn)' : tone === 'good' ? 'var(--person)' : 'var(--ink)'

/**
 * A road drawn as a dashed ink line (the style of the start map). A marked road is red with a cross
 * (can go) or green with a plus (to build).
 */
export function RoadLine({
  a,
  b,
  tone,
  ghost,
  mark = !ghost,
}: {
  a: Vec2
  b: Vec2
  tone?: Tone
  ghost?: boolean
  /** The cross or plus in the middle (default: on marked roads that are not faint). */
  mark?: boolean
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const colour = toneColour(tone)
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
    <g
      transform={board.upright(at[0], at[1])}
      pointerEvents="none"
      data-place={castle ? 'castle' : 'village'}
    >
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

/** A junction: an ink ring on the road; selected (or being moved) with a dashed halo; ghost: faint. */
function Junction({
  at,
  selected,
  ghost,
  tone,
}: {
  at: Vec2
  selected?: boolean
  ghost?: boolean
  tone?: Tone
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const [x, y] = at
  return (
    <g pointerEvents="none" data-junction={ghost ? 'ghost' : 'built'} opacity={ghost ? 0.75 : 1}>
      {(selected || tone) && (
        <circle
          cx={x}
          cy={y}
          r={18 * px}
          fill={tone ? toneColour(tone) : 'var(--light-soft)'}
          fillOpacity={tone ? 0.25 : 0.8}
          stroke={tone ? toneColour(tone) : 'var(--ink)'}
          strokeWidth={(tone ? 3 : 2.5) * px}
          strokeDasharray={selected || ghost ? `${5 * px} ${4 * px}` : undefined}
        />
      )}
      <circle
        cx={x}
        cy={y}
        r={JUNCTION_PX * px}
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth={3 * px}
        strokeDasharray={ghost ? `${4 * px} ${3 * px}` : undefined}
      />
      <circle cx={x} cy={y} r={3 * px} fill="var(--ink)" />
      {tone === 'bad' && <RoadMark at={[x + 18 * px, y - 18 * px]} tone="bad" />}
    </g>
  )
}

/**
 * The angles between the roads at a junction: an arc and the size in degrees (rounded) for each angle
 * below 180°. An angle of 120° (to the degree) has a solid arc, the others a dotted one.
 */
function JunctionAngles({
  nodes,
  roads,
  node,
}: {
  nodes: readonly Vec2[]
  roads: readonly Road[]
  node: number
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const [x, y] = nodes[node]!
  const r = 24 * px
  const label = 46 * px
  return (
    <g pointerEvents="none" data-testid="junction-angles">
      {anglesAt(nodes, roads, node)
        .filter((a) => a.size < Math.PI - 1e-6)
        .map(({ from, size }) => {
          const degrees = Math.round(toDegrees(size))
          const right = degrees === 120
          const to = from + size
          const mid = from + size / 2
          const [lx, ly] = [x + label * Math.cos(mid), y + label * Math.sin(mid)]
          const text = `${degrees}°`
          return (
            <g key={from}>
              <path
                d={`M${x + r * Math.cos(from)},${y + r * Math.sin(from)}A${r},${r} 0 0 1 ${x + r * Math.cos(to)},${y + r * Math.sin(to)}`}
                fill="none"
                stroke={right ? 'var(--person)' : 'var(--ink)'}
                strokeWidth={(right ? 3.5 : 2) * px}
                strokeDasharray={right ? undefined : `${2 * px} ${3 * px}`}
              />
              <g transform={board.upright(lx, ly)}>
                <rect
                  x={lx - 19 * px}
                  y={ly - 11 * px}
                  width={38 * px}
                  height={22 * px}
                  rx={6 * px}
                  fill="var(--paper)"
                  fillOpacity={0.9}
                  stroke={right ? 'var(--person)' : 'none'}
                  strokeWidth={2 * px}
                />
                <text
                  x={lx}
                  y={ly + 5.5 * px}
                  textAnchor="middle"
                  fontSize={16 * px}
                  fontWeight={right ? 'bold' : undefined}
                  fontFamily="var(--font-text)"
                  fill="var(--ink)"
                >
                  {text}
                </text>
              </g>
            </g>
          )
        })}
    </g>
  )
}

/** Junction editing ("Kreuzungen"): new junctions, bends in roads, moving and merging junctions. */
export interface JunctionEditing {
  junctions: readonly Vec2[]
  /** A road from node `from` to a new junction at `at` (dragged or tapped onto empty land). */
  onExtend(from: number, at: Vec2): void
  /** A road dragged at its middle: a new junction takes its place; returns the junction's node. */
  onSplit(road: Road, at: Vec2): number
  onMove(node: number, at: Vec2): void
  /** The junction let go, on another node (`onto`) or on empty land (null). */
  onMoveEnd(node: number, onto: number | null): void
}

interface RoadsLayerProps {
  map: RoadsMap
  roads: readonly Road[]
  highlight: Highlight
  /** Lines drawn faintly on top (the theory view). */
  overlay?: readonly Segment[]
  /** Roads in the warning colour (they cross another road), and the points where roads cross. */
  warn?: ReadonlySet<string>
  crossings?: readonly Vec2[]
  /** Whether two nodes may be joined; a refused road previews red, and letting go calls onRefuse. */
  canJoin?(a: number, b: number): boolean
  onRefuse?(): void
  edit?: JunctionEditing
  onBuild(road: Road): void
  onRemove(road: Road): void
}

type Drag =
  | { kind: 'build'; from: number }
  | { kind: 'move'; node: number }
  | { kind: 'bend'; road: Road; node: number | null }

/**
 * The map: settlements, junctions, the player's roads, and pointer input. Dragging from a settlement to
 * another builds a road; tapping two nodes one after the other does too; tapping a road removes it. With
 * junction editing, a road dragged onto empty land ends at a new junction there, a dragged junction moves
 * (dropped onto a node it merges into it), and a road dragged at its middle bends at a new junction.
 */
export function RoadsLayer({
  map,
  roads,
  highlight,
  overlay,
  warn,
  crossings,
  canJoin = () => true,
  onRefuse,
  edit,
  onBuild,
  onRemove,
}: RoadsLayerProps) {
  const board = useBoard()
  const places = map.points.length
  const nodes: Vec2[] = edit ? [...map.points, ...edit.junctions] : map.points
  const [selected, setSelected] = useState<number | null>(null)
  const [pointer, setPointer] = useState<Vec2 | null>(null)
  const [hoverRoad, setHoverRoad] = useState<string | null>(null)
  // The current drag, also as a ref: the handlers of one gesture run before React renders again.
  const [drag, setDragState] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const setDrag = (d: Drag | null) => {
    dragRef.current = d
    setDragState(d)
  }

  const nodeAt = (p: Vec2, except?: number): number | null => {
    let best: number | null = null
    let bestD = Infinity
    nodes.forEach((q, i) => {
      if (i === except) return
      const d = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (d <= board.pxToBoard(i < places ? HIT_PX : JUNCTION_HIT_PX) && d < bestD) {
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
      const d = segmentDistance(p, nodes[r[0]]!, nodes[r[1]]!)
      if (d <= bestD) {
        best = r
        bestD = d
      }
    }
    return best
  }
  const { minX, minY, maxX, maxY } = map.bounds
  const onLand = ([x, y]: Vec2): Vec2 => [
    Math.min(maxX + LAND_PAD, Math.max(minX - LAND_PAD, x)),
    Math.min(maxY + LAND_PAD, Math.max(minY - LAND_PAD, y)),
  ]
  const at = (e: React.PointerEvent): Vec2 => board.toBoard(e.clientX, e.clientY)
  const join = (a: number, b: number) => {
    if (a === b) return
    if (canJoin(a, b)) onBuild(normalise(a, b))
    else onRefuse?.()
  }

  const gesture = usePointerGesture(
    {
      onPress: (e) => {
        const p = at(e)
        const node = nodeAt(p)
        setPointer(p)
        if (node !== null)
          setDrag(edit && node >= places ? { kind: 'move', node } : { kind: 'build', from: node })
        else {
          const road = edit ? roadAt(p) : null
          setDrag(road ? { kind: 'bend', road, node: null } : null)
        }
      },
      onDragMove: (e) => {
        const p = at(e)
        setPointer(p)
        const d = dragRef.current
        if (!d || !edit) return
        if (d.kind === 'move') edit.onMove(d.node, onLand(p))
        else if (d.kind === 'bend') {
          if (d.node === null) setDrag({ ...d, node: edit.onSplit(d.road, onLand(p)) })
          else edit.onMove(d.node, onLand(p))
        }
      },
      onDragEnd: (e) => {
        const p = at(e)
        const d = dragRef.current
        if (d?.kind === 'build') {
          const target = nodeAt(p)
          if (target !== null) join(d.from, target)
          else if (edit) edit.onExtend(d.from, onLand(p))
        } else if (edit && d && d.node !== null) {
          edit.onMoveEnd(d.node, nodeAt(p, d.node))
        }
        setDrag(null)
        setPointer(null)
        setSelected(null)
      },
      onTap: (e) => {
        const p = at(e)
        const node = nodeAt(p)
        setDrag(null)
        setPointer(null)
        if (node !== null) {
          if (selected === null || selected === node) setSelected(selected === node ? null : node)
          else {
            join(selected, node)
            setSelected(null)
          }
          return
        }
        const r = roadAt(p)
        if (r) onRemove(r)
        else if (edit && selected !== null) edit.onExtend(selected, onLand(p))
        setSelected(null)
      },
    },
    // No long press: a slow tap on a settlement still selects it.
    { dragThreshold: 8, longPressMs: 1e9 },
  )

  const from = drag?.kind === 'build' ? drag.from : null
  const target = pointer && from !== null ? nodeAt(pointer) : null
  const previewEnd = target !== null && target !== from ? nodes[target]! : pointer
  const refused = from !== null && target !== null && target !== from && !canJoin(from, target)
  const moving = drag && drag.kind !== 'build' ? drag.node : null
  const pad = 1
  const ghost = highlight && 'at' in highlight ? highlight : null
  const markedNode = highlight && 'node' in highlight ? highlight : null
  return (
    <g>
      {roads.map((r) => {
        const key = roadKey(r)
        const tone =
          highlight && 'road' in highlight && roadKey(highlight.road) === key
            ? highlight.tone
            : warn?.has(key)
              ? 'bad'
              : hoverRoad === key
                ? 'bad'
                : undefined
        // Crossing roads carry their marks where they cross, not in the middle.
        const mark = !warn?.has(key) || (highlight && 'road' in highlight && roadKey(highlight.road) === key)
        return <RoadLine key={key} a={nodes[r[0]]!} b={nodes[r[1]]!} tone={tone} mark={!!mark} />
      })}
      {highlight && 'road' in highlight && highlight.tone === 'good' && (
        <RoadLine a={nodes[highlight.road[0]]!} b={nodes[highlight.road[1]]!} tone="good" ghost mark />
      )}
      {ghost && <RoadLine a={nodes[ghost.from]!} b={ghost.at} tone="good" ghost mark />}
      {overlay?.map(({ key, a, b, tone, ghost }) => (
        <RoadLine key={`o${key}`} a={a} b={b} tone={tone} ghost={ghost} />
      ))}
      {from !== null && previewEnd && (
        <RoadLine a={nodes[from]!} b={previewEnd} ghost tone={refused ? 'bad' : undefined} mark={refused} />
      )}
      {edit?.junctions.map((_, k) => {
        const v = places + k
        return (
          roads.some((r) => r[0] === v || r[1] === v) && (
            <JunctionAngles key={`a${v}`} nodes={nodes} roads={roads} node={v} />
          )
        )
      })}
      {edit?.junctions.map((j, k) => (
        <Junction
          key={`j${k}`}
          at={j}
          selected={places + k === selected || places + k === moving}
          tone={markedNode?.node === places + k ? markedNode.tone : undefined}
        />
      ))}
      {ghost && <Junction at={ghost.at} ghost tone="good" />}
      {map.points.map((p, i) => (
        <Settlement
          key={i}
          at={p}
          index={i}
          castle={i >= map.villages}
          selected={i === selected || i === from}
        />
      ))}
      {/* Above the places: a crossing next to a place must not hide under its icon. */}
      {crossings?.map((c) => (
        <CrossingRing key={`${c[0]},${c[1]}`} at={c} unit={board.pxToBoard(1)} />
      ))}
      <rect
        x={minX - pad}
        y={minY - pad}
        width={maxX - minX + 2 * pad}
        height={maxY - minY + 2 * pad}
        fill="transparent"
        data-testid="roads-input"
        style={{ cursor: drag ? 'grabbing' : 'pointer' }}
        {...gesture}
        onPointerMove={(e) => {
          gesture.onPointerMove(e)
          if (e.pointerType === 'mouse' && !drag) {
            const p = at(e)
            const r = nodeAt(p) === null ? roadAt(p) : null
            setHoverRoad(r ? roadKey(r) : null)
          }
        }}
        onPointerLeave={() => setHoverRoad(null)}
      />
    </g>
  )
}
