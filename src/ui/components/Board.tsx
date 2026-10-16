import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Bounds } from '../../core/geometry/types'
import { BoardContext, type BoardApi } from './boardContext'

interface BoardProps {
  /** Region of the board coordinates to show (y points down, as in the level JSON). */
  bounds: Bounds
  /** Margin around the bounds, in board units. */
  padding?: number
  children: ReactNode
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
export function Board({ bounds, padding = 0, children, className, label, ...handlers }: BoardProps) {
  const svg = useRef<SVGSVGElement>(null)
  const filterId = `ink-${useId().replace(/[^\w-]/g, '')}`
  const [scale, setScale] = useState(1)
  const x = bounds.minX - padding
  const y = bounds.minY - padding
  const w = bounds.maxX - bounds.minX + 2 * padding
  const h = bounds.maxY - bounds.minY + 2 * padding

  useLayoutEffect(() => {
    const el = svg.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setScale(Math.min(rect.width / w, rect.height / h))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [w, h])

  const api = useMemo<BoardApi>(
    () => ({
      toBoard(clientX, clientY) {
        const el = svg.current
        const ctm = el?.getScreenCTM()
        if (!el || !ctm) return [0, 0]
        const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
        return [p.x, p.y]
      },
      pxToBoard: (px) => px / scale,
      scale,
      ink: `url(#${filterId})`,
    }),
    [scale, filterId],
  )

  return (
    <svg
      ref={svg}
      viewBox={`${x} ${y} ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
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
      <BoardContext.Provider value={api}>{children}</BoardContext.Provider>
    </svg>
  )
}
