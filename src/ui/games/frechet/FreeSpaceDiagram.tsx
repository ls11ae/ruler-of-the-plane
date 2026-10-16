import { useLayoutEffect, useMemo, useRef } from 'react'
import type { Walk } from '../../../core/games/frechet/frechet'
import type { Path } from '../../../core/games/frechet/path'
import styles from './Frechet.module.css'
import { distanceField, paintField } from './freeSpace'

/** Resolution of the painted free space (the canvas is scaled smoothly to the diagram size). */
const FIELD_SIZE = 200

export interface DiagramWalk {
  walk: Walk
  kind: 'player' | 'computer'
  /** Draw only this share of the walk (0–1), for animations. */
  progress?: number
}

interface DiagramProps {
  person: Path
  dog: Path
  eps: number
  walks: DiagramWalk[]
  /** A marked position (the narrowest spot of the computer's walk). */
  marker?: readonly [number, number] | null
  /** The position under the pointer (shown as a cross). */
  probe?: readonly [number, number] | null
  onProbe?: (at: [number, number] | null) => void
  label: string
  axes: { person: string; dog: string }
}

/**
 * A small arrow drawn in SVG (Patrick Hand has no arrow glyphs). The y label is written bottom to top
 * (turned by 180°), so its arrow is drawn pointing down to point up on screen.
 */
function AxisArrow({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={styles.axisArrow} aria-hidden="true">
      <g transform={up ? 'rotate(90 10 10)' : undefined} stroke="currentColor" strokeWidth={2.4} fill="none">
        <path d="M3 10h13M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/**
 * The free-space diagram: x = how far the person has walked, y = how far the dog has run (both as
 * arc lengths, so the axes are the two paths). Light where the leash eps reaches, hatched where not;
 * thin lines at the corners of the paths; walks drawn as curves.
 */
export function FreeSpaceDiagram({
  person,
  dog,
  eps,
  walks,
  marker,
  probe,
  onProbe,
  label,
  axes,
}: DiagramProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const field = useMemo(() => distanceField(person, dog, FIELD_SIZE), [person, dog])

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const image = ctx.createImageData(field.n, field.n)
    paintField(image, field, eps)
    ctx.putImageData(image, 0, 0)
  }, [field, eps])

  const X = (s: number) => (s / person.length) * 100
  const Y = (t: number) => 100 - (t / dog.length) * 100
  const points = (w: Walk) => w.map(([s, t]) => `${X(s)},${Y(t)}`).join(' ')

  const probeAt = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onProbe) return
    const r = e.currentTarget.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const fy = Math.min(1, Math.max(0, (r.bottom - e.clientY) / r.height))
    onProbe([fx * person.length, fy * dog.length])
  }

  return (
    <div className={styles.diagram}>
      <span className={styles.yAxis}>
        {axes.dog}
        <AxisArrow up />
      </span>
      <div className={styles.plot}>
        <canvas ref={canvas} width={field.n} height={field.n} className={styles.field} aria-hidden="true" />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={styles.overlay}
          role="img"
          aria-label={label}
          onPointerMove={probeAt}
          onPointerDown={probeAt}
          onPointerLeave={() => onProbe?.(null)}
        >
          <g stroke="var(--ink)" strokeOpacity={0.22} strokeWidth={1} vectorEffect="non-scaling-stroke">
            {person.cumulative.slice(1, -1).map((c, i) => (
              <line key={`x${i}`} x1={X(c)} x2={X(c)} y1={0} y2={100} vectorEffect="non-scaling-stroke" />
            ))}
            {dog.cumulative.slice(1, -1).map((c, i) => (
              <line key={`y${i}`} y1={Y(c)} y2={Y(c)} x1={0} x2={100} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          {walks.map(({ walk, kind, progress }, i) => (
            <polyline
              key={i}
              points={points(walk)}
              fill="none"
              stroke={kind === 'player' ? 'var(--person)' : 'var(--ink)'}
              strokeWidth={kind === 'player' ? 3.5 : 2}
              strokeDasharray={kind === 'computer' ? '7 5' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pathLength={progress === undefined ? undefined : 1}
              style={
                progress === undefined || kind === 'computer'
                  ? undefined
                  : { strokeDasharray: '1 1', strokeDashoffset: 1 - progress }
              }
              data-testid={`diagram-${kind}`}
            />
          ))}
          {marker && (
            <circle
              cx={X(marker[0])}
              cy={Y(marker[1])}
              r={2.2}
              fill="var(--warn)"
              stroke="var(--ink)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {probe && (
            <g stroke="var(--player-1)" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
              <line x1={X(probe[0])} x2={X(probe[0])} y1={0} y2={100} vectorEffect="non-scaling-stroke" />
              <line y1={Y(probe[1])} y2={Y(probe[1])} x1={0} x2={100} vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </svg>
      </div>
      <span className={styles.xAxis}>
        {axes.person}
        <AxisArrow />
      </span>
    </div>
  )
}
