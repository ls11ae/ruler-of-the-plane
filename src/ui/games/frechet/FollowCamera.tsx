import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { PARK } from '../../../core/games/frechet/levels'
import { pointAt, type Path } from '../../../core/games/frechet/path'
import type { Vec2 } from '../../../core/geometry/types'
import { Board } from '../../components/Board'
import { useAnimationFrame } from '../../input/hooks'
import { art } from './art'
import { cameraTarget, cameraZoom, follow, PAD } from './camera'
import styles from './Frechet.module.css'
import { CASTLE } from './scenery'

interface FollowCameraProps {
  /** Off (the whole park, turned on portrait screens as before) e.g. while the theory panel is open. */
  enabled: boolean
  leash: number
  person: Path
  dog: Path
  /** Where person and dog are (metres along their paths). */
  at: readonly [number, number]
  /** Trunks, drawn as dots on the overview map. */
  marks?: readonly Vec2[]
  label: string
  children: ReactNode
}

const poly = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

/**
 * The park as seen by a camera that follows person and dog: zoomed in so that the leash and the trunks
 * are clearly visible, looking ahead along both paths, with a small overview map of the whole route.
 * The whole park is drawn once at the camera's zoom on a stage larger than the screen, and the camera
 * moves the stage (a CSS transform written every frame, so following costs no re-render and no
 * repaint of the scenery). Where zooming in would hardly help (a long leash on a large screen), or
 * while the camera is off, the board shows the whole park as before.
 */
export function FollowCamera({
  enabled,
  leash,
  person,
  dog,
  at,
  marks = [],
  label,
  children,
}: FollowCameraProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const frame = useRef<SVGRectElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const zoom = enabled ? cameraZoom(size.width, size.height, leash) : null
  // The camera's centre (metres) and what it follows, read by the frame loop.
  const camera = useRef<Vec2 | null>(null)
  const follows = useRef({ at, person, dog })
  useLayoutEffect(() => {
    follows.current = { at, person, dog }
  })

  useLayoutEffect(() => {
    const el = viewport.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Place the stage for the camera's centre (and the frame on the overview map).
  const place = (centre: Vec2) => {
    if (!zoom || !stage.current) return
    const tx = size.width / 2 - (centre[0] - (PARK.minX - PAD)) * zoom
    const ty = size.height / 2 - (centre[1] - (PARK.minY - PAD)) * zoom
    stage.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
    const w = size.width / zoom
    const h = size.height / zoom
    frame.current?.setAttribute('x', String(centre[0] - w / 2))
    frame.current?.setAttribute('y', String(centre[1] - h / 2))
    frame.current?.setAttribute('width', String(w))
    frame.current?.setAttribute('height', String(h))
  }
  const target = () => {
    const {
      at: [s, t],
      person: p,
      dog: d,
    } = follows.current
    return cameraTarget({ w: size.width / zoom!, h: size.height / zoom! }, p, d, s, t)
  }

  // A new zoom or screen size: jump to the target at once.
  useLayoutEffect(() => {
    if (!zoom) {
      camera.current = null
      return
    }
    camera.current = target()
    place(camera.current)
    // Only on a new zoom or size; the frame loop follows from then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, size.width, size.height])

  useAnimationFrame((_, dtMs) => {
    if (!camera.current) return
    const next = follow(camera.current, target(), Math.min(dtMs, 100) / 1000)
    if (Math.abs(next[0] - camera.current[0]) + Math.abs(next[1] - camera.current[1]) < 0.02 / zoom!) return
    camera.current = next
    place(next)
  }, zoom !== null)

  const [s, t] = at
  return (
    <div ref={viewport} className={styles.viewport}>
      {zoom ? (
        <>
          <div
            ref={stage}
            className={styles.stage}
            style={{
              width: (PARK.maxX - PARK.minX + 2 * PAD) * zoom,
              height: (PARK.maxY - PARK.minY + 2 * PAD) * zoom,
            }}
            data-testid="camera"
          >
            <Board bounds={PARK} padding={PAD} label={label}>
              {children}
            </Board>
          </div>
          <svg
            className={styles.overview}
            viewBox={`${PARK.minX - PAD} ${PARK.minY - PAD} ${PARK.maxX - PARK.minX + 2 * PAD} ${PARK.maxY - PARK.minY + 2 * PAD}`}
            aria-hidden="true"
            data-testid="overview"
          >
            <rect
              x={PARK.minX}
              y={PARK.minY}
              width={PARK.maxX}
              height={PARK.maxY}
              rx={1}
              fill="var(--land-wash)"
            />
            <polyline
              points={poly(person.points)}
              fill="none"
              stroke="#c9ad73"
              strokeWidth={0.9}
              strokeLinejoin="round"
            />
            <polyline
              points={poly(dog.points)}
              fill="none"
              stroke="var(--ink-soft)"
              strokeWidth={0.3}
              strokeDasharray="0.5 0.5"
            />
            {marks.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={0.5} fill="#6e5236" />
            ))}
            <image href={art.castle} x={CASTLE[0] - 2.4} y={CASTLE[1] - 2.4} width={4.8} height={4.8} />
            <rect
              ref={frame}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={0.35}
              strokeDasharray="1 0.6"
              rx={0.4}
            />
            <circle
              cx={pointAt(dog, t)[0]}
              cy={pointAt(dog, t)[1]}
              r={0.9}
              fill="var(--ink-soft)"
              stroke="var(--paper)"
              strokeWidth={0.25}
            />
            <circle
              cx={pointAt(person, s)[0]}
              cy={pointAt(person, s)[1]}
              r={0.9}
              fill="var(--person)"
              stroke="var(--ink)"
              strokeWidth={0.25}
            />
          </svg>
        </>
      ) : (
        <Board bounds={PARK} padding={PAD} autoRotate label={label}>
          {children}
        </Board>
      )}
    </div>
  )
}
