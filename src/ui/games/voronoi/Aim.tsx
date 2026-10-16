import { useRef } from 'react'
import type { Player } from '../../../core/games/voronoi/rules'
import type { Bounds, Vec2 } from '../../../core/geometry/types'
import { useBoard } from '../../components/boardContext'
import { CastleSprite, CASTLE_SIZE } from './Castles'
import { PLAYER_COLOURS } from './drawing'

/** With touch, the ghost castle floats this far above the finger, so the finger does not hide it. */
export const TOUCH_LIFT_PX = 64
/** A touch shorter than this (and without moving) only shows how to aim; it builds nothing. */
const MIN_HOLD_MS = 180

export interface Aim {
  at: Vec2
  touch: boolean
}

/**
 * Pointer input on the map. Mouse: the ghost castle follows the pointer, a click builds. Touch and pen:
 * press, aim (the ghost floats above the finger), release to build.
 */
export function AimControls({
  bounds,
  enabled,
  onAim,
  onPlace,
  onShortTouch,
}: {
  bounds: Bounds
  enabled: boolean
  onAim: (aim: Aim | null) => void
  onPlace: (at: Vec2) => void
  onShortTouch: () => void
}) {
  const board = useBoard()
  const press = useRef<{
    id: number
    t: number
    x: number
    y: number
    moved: boolean
    touch: boolean
  } | null>(null)
  const pointAt = (e: React.PointerEvent, touch: boolean): Vec2 =>
    board.toBoard(e.clientX, e.clientY - (touch ? TOUCH_LIFT_PX : 0))

  const end = () => {
    press.current = null
  }

  return (
    <rect
      x={bounds.minX - 50}
      y={bounds.minY - 50}
      width={bounds.maxX - bounds.minX + 100}
      height={bounds.maxY - bounds.minY + 100}
      fill="transparent"
      style={{ cursor: enabled ? 'crosshair' : 'wait' }}
      onPointerDown={(e) => {
        if (!enabled || press.current || (e.pointerType === 'mouse' && e.button !== 0)) return
        const touch = e.pointerType !== 'mouse'
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // Synthetic pointers have nothing to capture.
        }
        press.current = { id: e.pointerId, t: e.timeStamp, x: e.clientX, y: e.clientY, moved: false, touch }
        onAim({ at: pointAt(e, touch), touch })
      }}
      onPointerMove={(e) => {
        // The mouse is followed also while waiting for the computer, so the ghost is in place at once.
        if (!enabled && e.pointerType !== 'mouse') return
        const p = press.current
        if (p && p.id !== e.pointerId) return
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) p.moved = true
        const touch = p?.touch ?? e.pointerType !== 'mouse'
        // A finger hovering does not exist: without a press, only the mouse aims.
        if (!p && touch) return
        onAim({ at: pointAt(e, touch), touch })
      }}
      onPointerUp={(e) => {
        const p = press.current
        if (!p || p.id !== e.pointerId) return
        end()
        if (!enabled) return
        if (p.touch) {
          onAim(null)
          if (p.moved || e.timeStamp - p.t >= MIN_HOLD_MS) onPlace(pointAt(e, true))
          else onShortTouch()
        } else onPlace(pointAt(e, false))
      }}
      onPointerCancel={() => {
        end()
        onAim(null)
      }}
      onLostPointerCapture={(e) => {
        // Capture lost without a pointerup (e.g. the board re-rendered away): never stay stuck.
        const p = press.current
        if (p?.id !== e.pointerId) return
        end()
        if (p.touch) onAim(null)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse' && !press.current) onAim(null)
      }}
    />
  )
}

export interface PreviewInfo {
  /** Lines of the tooltip; `warn` for a position where the castle may not stand. */
  lines: string[]
  warn: boolean
}

/** The ghost castle at the aimed position with its distance ring and a tooltip with the gain. */
export function Ghost({
  at,
  owner,
  minDist,
  info,
  frame,
}: {
  at: Vec2
  owner: Player
  minDist: number
  info: PreviewInfo
  frame: Bounds
}) {
  const board = useBoard()
  const [x, y] = at
  const font = board.pxToBoard(17)
  const pad = board.pxToBoard(8)
  const width = Math.max(...info.lines.map((l) => l.length)) * font * 0.48 + 2 * pad
  const height = info.lines.length * font * 1.15 + 2 * pad * 0.8
  // Right of the castle on screen, unless that leaves the map; then left.
  const gap = CASTLE_SIZE * 0.5
  const roomRight = board.rotation ? y - (gap + width) > frame.minY : x + gap + width < frame.maxX
  const left = roomRight ? x + gap : x - gap - width
  const top = y - CASTLE_SIZE * 1.2
  const colour = info.warn ? 'var(--warn)' : PLAYER_COLOURS[owner]
  return (
    <g pointerEvents="none">
      <circle
        cx={x}
        cy={y}
        r={minDist / 2}
        fill="none"
        stroke={colour}
        strokeWidth={board.pxToBoard(2.5)}
        strokeDasharray={`${board.pxToBoard(6)} ${board.pxToBoard(4)}`}
      />
      <CastleSprite at={at} owner={owner} ghost />
      <g transform={board.upright(x, y)}>
        <rect
          x={left}
          y={top}
          width={width}
          height={height}
          rx={board.pxToBoard(8)}
          fill="var(--paper)"
          stroke={colour}
          strokeWidth={board.pxToBoard(2.5)}
        />
        {info.lines.map((line, i) => (
          <text
            key={i}
            x={left + pad}
            y={top + pad * 0.8 + font * (0.95 + i * 1.15)}
            fontSize={font}
            fontFamily="var(--font-text)"
            fill={info.warn ? 'var(--warn)' : 'var(--ink)'}
          >
            {line}
          </text>
        ))}
      </g>
    </g>
  )
}
