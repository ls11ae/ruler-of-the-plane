import { useMemo, useState } from 'react'
import { TAUT_SHARE } from '../../../core/games/frechet/rules'
import type { Vec2 } from '../../../core/geometry/types'
import { useBoard } from '../../components/boardContext'
import { useAnimationFrame } from '../../input/hooks'
import { polylineLength, screenDown, slackLeash, trembling } from './leashShape'
import { useMedia } from './useMedia'

/** How long the snapped leash recoils (ms). */
const SNAP_MS = 650

const polyline = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ')

/**
 * The leash, alive: drawn with its real length (slack: a soft curve that hangs down; the slack goes
 * into the free ends when it lies round trunks), orange-red from 85 % on, straight and trembling when
 * taut, and when it snaps, its two halves recoil to person and dog with a flash at the break.
 */
export function LiveLeash({
  points,
  length,
  leash,
  snapped = false,
  ghost = false,
  label,
}: {
  /** The taut leash as drawn: person, trunk corners, dog. */
  points: readonly Vec2[]
  /** The leash's length (metres). */
  length: number
  /** How long it is now, measured around the trunks (metres). */
  leash: number
  snapped?: boolean
  ghost?: boolean
  label?: string
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const still = useMedia('(prefers-reduced-motion: reduce)')
  const tension = leash / length
  const taut = tension >= TAUT_SHARE || snapped
  const amplitude =
    ghost || still || snapped ? 0 : 2.2 * px * Math.min(1, Math.max(0, (tension - 0.95) / 0.05))
  const [phase, setPhase] = useState(0)
  useAnimationFrame((now) => setPhase((now / 140) % 1), amplitude > 0)
  const shape = useMemo(() => {
    const drawn = polylineLength(points)
    return slackLeash(points, drawn + Math.max(0, length - leash), screenDown(board.rotation))
  }, [points, length, leash, board.rotation])
  const colour = taut ? 'var(--warn)' : 'var(--ink)'
  const width = (taut ? 4.5 : 3.5) * px
  if (snapped && !ghost) return <SnappedLeash points={points} width={width} still={still} />
  return (
    <g pointerEvents="none" opacity={ghost ? 0.7 : 1} data-testid={ghost ? undefined : 'leash-line'}>
      <polyline
        points={polyline(amplitude > 0 ? trembling(shape, amplitude, phase) : shape)}
        fill="none"
        stroke={colour}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={ghost ? `${8 * px} ${5 * px}` : undefined}
      />
      {label && <LengthBadge points={points} text={label} taut={taut} />}
    </g>
  )
}

/** The length beside the middle of the longest straight piece, once that is long enough. */
function LengthBadge({ points, text, taut }: { points: readonly Vec2[]; text: string; taut: boolean }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  let best = 0
  const d = (k: number) => Math.hypot(points[k + 1]![0] - points[k]![0], points[k + 1]![1] - points[k]![1])
  for (let i = 1; i + 1 < points.length; i++) if (d(i) > d(best)) best = i
  const [a, b] = [points[best]!, points[best + 1]!]
  const len = d(best)
  if (len <= 64 * px) return null
  // Beside the leash, on the side away from where it sags.
  const down = screenDown(board.rotation)
  let nx = -(b[1] - a[1]) / len
  let ny = (b[0] - a[0]) / len
  if (nx * down[0] + ny * down[1] > 0) {
    nx = -nx
    ny = -ny
  }
  const at: Vec2 = [(a[0] + b[0]) / 2 + nx * 20 * px, (a[1] + b[1]) / 2 + ny * 20 * px]
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

/** The point at a share of a polyline's length, and the polyline cut there. */
function cut(pts: readonly Vec2[], share: number): [Vec2[], Vec2[], Vec2] {
  const total = polylineLength(pts)
  let left = share * total
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!
    const [bx, by] = pts[i]!
    const d = Math.hypot(bx - ax, by - ay)
    if (left <= d || i === pts.length - 1) {
      const u = d > 0 ? Math.min(1, left / d) : 0
      const p: Vec2 = [ax + (bx - ax) * u, ay + (by - ay) * u]
      return [[...pts.slice(0, i), p], [p, ...pts.slice(i)], p]
    }
    left -= d
  }
  return [pts.slice(), [pts[pts.length - 1]!], pts[pts.length - 1]!]
}

/** The first `share` of a polyline's length. */
const head = (pts: readonly Vec2[], share: number) => cut(pts, share)[0]

/**
 * The snapped leash: it breaks in the middle, the halves spring back to person and dog (each keeps a
 * quarter of its length, dangling), and lines flash out from the break.
 */
function SnappedLeash({ points, width, still }: { points: readonly Vec2[]; width: number; still: boolean }) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  const [start] = useState(() => performance.now())
  const [now, setNow] = useState(start)
  const progress = still ? 1 : Math.min(1, (now - start) / SNAP_MS)
  useAnimationFrame((t) => setNow(t), progress < 1)
  const [toPerson, toDog, at] = useMemo(() => cut(points, 0.5), [points])
  // Ease out: fast at first, like a rope springing back.
  const e = 1 - (1 - progress) ** 3
  const keep = 1 - 0.75 * e
  const down = screenDown(board.rotation)
  const sag = 10 * px * e
  const personHalf = head(toPerson, keep).map(([x, y], i, all): Vec2 => {
    const u = i / Math.max(1, all.length - 1)
    return [x + down[0] * sag * u * u, y + down[1] * sag * u * u]
  })
  const dogHalf = head([...toDog].reverse(), keep).map(([x, y], i, all): Vec2 => {
    const u = i / Math.max(1, all.length - 1)
    return [x + down[0] * sag * u * u, y + down[1] * sag * u * u]
  })
  const burst = 1 - progress
  return (
    <g pointerEvents="none" data-testid="leash-snapped">
      {[personHalf, dogHalf].map((half, i) => (
        <polyline
          key={i}
          points={polyline(half)}
          fill="none"
          stroke="var(--warn)"
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {burst > 0 && (
        <g stroke="var(--warn)" strokeWidth={3 * px} strokeLinecap="round" opacity={burst}>
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4 + 0.3
            const r0 = (6 + 16 * progress) * px
            const r1 = (14 + 26 * progress) * px
            return (
              <line
                key={k}
                x1={at[0] + r0 * Math.cos(a)}
                y1={at[1] + r0 * Math.sin(a)}
                x2={at[0] + r1 * Math.cos(a)}
                y2={at[1] + r1 * Math.sin(a)}
              />
            )
          })}
        </g>
      )}
    </g>
  )
}
