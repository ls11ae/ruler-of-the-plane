import { useState } from 'react'
import { isOnFloor } from '../../../core/games/art-gallery/dungeon'
import type { Vec2 } from '../../../core/geometry/types'
import type { ArtGalleryLevel } from '../../../core/levels/schema'
import { useBoard } from '../../components/boardContext'
import { usePointerGesture } from '../../input/hooks'
import { Torch, type TorchState } from './Torch'

export interface PlacedTorch {
  id: number
  at: Vec2
}

export interface DragState {
  id: number
  at: Vec2
  /** On the floor: the torch would stay (and lights while dragged). */
  valid: boolean
  /** Over the bucket: the torch would be removed. */
  overTrash: boolean
}

/** A torch dragged by touch is drawn this far above the finger, so the finger does not hide it. */
export const TOUCH_LIFT_PX = 64

interface TorchControlsProps {
  level: ArtGalleryLevel
  torches: readonly PlacedTorch[]
  drag: DragState | null
  hovered: number | null
  /** Radius of a drawn torch in pixels (at least 22: 44 px targets). */
  radiusPx: number
  canAdd: boolean
  isOverTrash(clientX: number, clientY: number): boolean
  onAdd(at: Vec2): void
  onDrag(drag: DragState | null): void
  onDrop(drag: DragState): void
  onHover(id: number | null): void
}

/**
 * Pointer input on the dungeon: tap or click on the floor places a torch, dragging a torch moves it,
 * dropping it off the floor or on the bucket removes it. With touch the dragged torch floats above the
 * finger. Also draws the torches.
 */
export function TorchControls(props: TorchControlsProps) {
  const { level, torches, drag, hovered, radiusPx } = props
  const board = useBoard()
  const radius = board.pxToBoard(radiusPx)
  const hitRadius = board.pxToBoard(Math.max(radiusPx + 4, 26))
  const [grab, setGrab] = useState<{ id: number; offset: Vec2; touch: boolean } | null>(null)

  const torchAt = (p: Vec2) => {
    let best: PlacedTorch | null = null
    let bestD = hitRadius
    for (const t of torches) {
      const d = Math.hypot(t.at[0] - p[0], t.at[1] - p[1])
      if (d <= bestD) {
        best = t
        bestD = d
      }
    }
    return best
  }

  const dragTo = (e: React.PointerEvent) => {
    if (!grab) return null
    const at: Vec2 = grab.touch
      ? board.toBoard(e.clientX, e.clientY - TOUCH_LIFT_PX)
      : (([x, y]) => [x + grab.offset[0], y + grab.offset[1]] as const)(board.toBoard(e.clientX, e.clientY))
    const overTrash = props.isOverTrash(e.clientX, e.clientY)
    return { id: grab.id, at, valid: !overTrash && isOnFloor(level, at), overTrash }
  }

  const gesture = usePointerGesture({
    onPress(e) {
      const p = board.toBoard(e.clientX, e.clientY)
      const t = torchAt(p)
      setGrab(
        t ? { id: t.id, offset: [t.at[0] - p[0], t.at[1] - p[1]], touch: e.pointerType !== 'mouse' } : null,
      )
    },
    onTap(e) {
      setGrab(null)
      const p = board.toBoard(e.clientX, e.clientY)
      if (!torchAt(p) && props.canAdd && isOnFloor(level, p)) props.onAdd(p)
    },
    onDragMove(e) {
      const d = dragTo(e)
      if (d) props.onDrag(d)
    },
    onDragEnd(e) {
      const d = dragTo(e)
      setGrab(null)
      if (d) props.onDrop(d)
      else props.onDrag(null)
    },
  })

  const b = level.bounds
  return (
    <>
      {torches.map((t) => {
        const dragged = drag?.id === t.id
        const state: TorchState = dragged
          ? drag.overTrash
            ? 'trash'
            : drag.valid
              ? 'active'
              : 'invalid'
          : hovered === t.id
            ? 'active'
            : 'idle'
        return <Torch key={t.id} at={dragged ? drag.at : t.at} radius={radius} state={state} />
      })}
      <rect
        x={b.minX - 20}
        y={b.minY - 20}
        width={b.maxX - b.minX + 40}
        height={b.maxY - b.minY + 40}
        fill="transparent"
        style={{ cursor: grab ? 'grabbing' : hovered !== null ? 'grab' : 'crosshair' }}
        {...gesture}
        onPointerMove={(e) => {
          gesture.onPointerMove(e)
          if (!grab && e.pointerType === 'mouse')
            props.onHover(torchAt(board.toBoard(e.clientX, e.clientY))?.id ?? null)
        }}
        onPointerLeave={() => props.onHover(null)}
      />
    </>
  )
}
