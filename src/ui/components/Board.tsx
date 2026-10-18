import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Bounds } from '../../core/geometry/types'
import { BoardContext, type BoardApi } from './boardContext'

interface BoardProps {
  /** Region of the board coordinates to show (y points down, as in the level JSON). */
  bounds: Bounds
  /** Margin around the bounds, in board units. */
  padding?: number
  /**
   * Turn the board by 90° when that shows it clearly larger, e.g. a wide dungeon on a phone held
   * upright. Pointer conversion (`toBoard`) takes the turn into account.
   */
  autoRotate?: boolean
  children: ReactNode
  /**
   * Static art drawn below `children`, in a layer of its own: the browser keeps its pixels while the
   * board changes (dragging, walking), instead of drawing it again every frame. Use it for art under an
   * ink filter (floor, park, land), which is slow to draw.
   */
  under?: ReactNode
  /** Static art drawn above `children` in a layer of its own (e.g. walls with the ink filter). */
  over?: ReactNode
  /**
   * Drawn above `over` (tokens that must stay on top of the static art); pointer input goes through it
   * to the board below.
   */
  front?: ReactNode
  className?: string
  /** Accessible description of the board. */
  label?: string
  onPointerDown?: React.PointerEventHandler<SVGSVGElement>
  onPointerMove?: React.PointerEventHandler<SVGSVGElement>
  onPointerUp?: React.PointerEventHandler<SVGSVGElement>
  onPointerCancel?: React.PointerEventHandler<SVGSVGElement>
  onPointerLeave?: React.PointerEventHandler<SVGSVGElement>
}

/**
 * An SVG board that fits its container (letterboxed, aspect ratio kept). Children draw in board
 * coordinates; `useBoard()` converts pointer positions and pixel sizes. Touch gestures of the browser
 * (scrolling, zooming) are off on the board.
 */
export function Board({
  bounds,
  padding = 0,
  autoRotate = false,
  children,
  under,
  over,
  front,
  className,
  label,
  ...handlers
}: BoardProps) {
  const svg = useRef<SVGSVGElement>(null)
  const content = useRef<SVGGElement>(null)
  const filterId = `ink-${useId().replace(/[^\w-]/g, '')}`
  const [view, setView] = useState({ scale: 1, rotated: false })
  const { scale, rotated } = view
  const x = bounds.minX - padding
  const y = bounds.minY - padding
  const w = bounds.maxX - bounds.minX + 2 * padding
  const h = bounds.maxY - bounds.minY + 2 * padding

  useLayoutEffect(() => {
    const el = svg.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (!(width > 0 && height > 0)) return
      const upright = Math.min(width / w, height / h)
      const turned = Math.min(width / h, height / w)
      // Turn only for a clear gain, so a nearly square board does not flip back and forth.
      const rotate = autoRotate && turned > upright * 1.15
      setView({ scale: rotate ? turned : upright, rotated: rotate })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [w, h, autoRotate])

  const api = useMemo<BoardApi>(
    () => ({
      toBoard(clientX, clientY) {
        const ctm = content.current?.getScreenCTM()
        if (!ctm) return [0, 0]
        const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
        return [p.x, p.y]
      },
      pxToBoard: (px) => px / scale,
      scale,
      ink: `url(#${filterId})`,
      rotation: rotated ? 90 : 0,
      upright: (px, py) => (rotated ? `rotate(-90 ${px} ${py})` : undefined),
    }),
    [scale, rotated, filterId],
  )

  // rotate(90) maps (x, y) to (−y, x): the turned board spans x′ ∈ [−(y + h), −y], y′ ∈ [x, x + w].
  const viewBox = rotated ? `${-(y + h)} ${x} ${h} ${w}` : `${x} ${y} ${w} ${h}`

  const rotate = rotated ? 'rotate(90)' : undefined
  const board = (
    <svg
      ref={svg}
      viewBox={viewBox}
      data-rotated={rotated || undefined}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        position: under || over || front ? 'relative' : undefined,
      }}
      role="img"
      aria-label={label}
      {...handlers}
    >
      <defs>
        {/* Same look as the global #ink filter (InkDefs), in board units: about 2.5 px displacement. */}
        <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={0.035 * scale}
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={2.5 / scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g ref={content} transform={rotate}>
        <BoardContext.Provider value={api}>{children}</BoardContext.Provider>
      </g>
    </svg>
  )
  if (!under && !over && !front) return board

  // The layers: same view, no pointer input, each on its own compositing layer (will-change).
  const layer = (art: ReactNode) => (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      <g transform={rotate}>
        <BoardContext.Provider value={api}>{art}</BoardContext.Provider>
      </g>
    </svg>
  )
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {under && layer(under)}
      {board}
      {over && layer(over)}
      {front && layer(front)}
    </div>
  )
}
