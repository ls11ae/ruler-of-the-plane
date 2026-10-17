import { useMemo, useRef, useState } from 'react'
import { PARK, type WalkLevel } from '../../../core/games/frechet/levels'
import { simplify } from '../../../core/games/frechet/path'
import { frechetDistance } from '../../../core/games/frechet/frechet'
import { leashAt, makeCourse, positions, roundUp } from '../../../core/games/frechet/rules'
import type { Vec2 } from '../../../core/geometry/types'
import { Board } from '../../components/Board'
import { useBoard } from '../../components/boardContext'
import { Button } from '../../components/Button'
import { GameHeader } from '../../components/GameHeader'
import { LiveLeash } from './LiveLeash'
import { MapLabel, Walkers } from './ParkArt'
import styles from './Frechet.module.css'
import type { FrechetTexts } from './i18n.de'
import { TheoryPanel } from './Theory'
import { useMedia } from './useMedia'

/** Drawn paths are simplified to at most this many segments (the core's limit). */
const MAX_SEGMENTS = 20
/** A drawn path must be at least this long (metres) to count. */
const MIN_LENGTH = 3
/** Wobbles of the hand smaller than this (metres) are smoothed away. */
const TOLERANCE = 0.35

const polyline = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')
const clampToPark = ([x, y]: Vec2): Vec2 => [
  Math.min(PARK.maxX, Math.max(PARK.minX, x)),
  Math.min(PARK.maxY, Math.max(PARK.minY, y)),
]

/** Pointer input over the park: press and drag draws a line, release finishes it. */
function DrawLayer({ onLine, colour }: { onLine: (points: Vec2[]) => void; colour: string }) {
  const board = useBoard()
  const [stroke, setStroke] = useState<Vec2[]>([])
  const pointer = useRef<number | null>(null)
  const at = (e: React.PointerEvent) => clampToPark(board.toBoard(e.clientX, e.clientY))
  return (
    <>
      <polyline
        points={polyline(stroke)}
        fill="none"
        stroke={colour}
        strokeWidth={board.pxToBoard(5)}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
      <rect
        x={PARK.minX}
        y={PARK.minY}
        width={PARK.maxX - PARK.minX}
        height={PARK.maxY - PARK.minY}
        fill="transparent"
        style={{ cursor: 'crosshair' }}
        data-testid="draw-layer"
        onPointerDown={(e) => {
          if (pointer.current !== null) return
          pointer.current = e.pointerId
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // Synthetic pointer: drawing works without capture.
          }
          setStroke([at(e)])
        }}
        onPointerMove={(e) => {
          if (pointer.current !== e.pointerId) return
          const p = at(e)
          setStroke((s) => {
            const last = s[s.length - 1]
            return last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.25 ? s : [...s, p]
          })
        }}
        onPointerUp={(e) => {
          if (pointer.current !== e.pointerId) return
          pointer.current = null
          const line = [...stroke, at(e)]
          setStroke([])
          let length = 0
          for (let i = 1; i < line.length; i++)
            length += Math.hypot(line[i]![0] - line[i - 1]![0], line[i]![1] - line[i - 1]![1])
          if (length >= MIN_LENGTH) onLine(simplify(line, MAX_SEGMENTS, TOLERANCE))
        }}
        onPointerCancel={() => {
          pointer.current = null
          setStroke([])
        }}
      />
    </>
  )
}

/** The theory view's sandbox: draw the person's path, then the dog's, and look at their diagram. */
export function SandboxScreen({
  t,
  onTry,
  onBack,
}: {
  t: FrechetTexts
  onTry: (level: WalkLevel) => void
  onBack: () => void
}) {
  const [person, setPerson] = useState<Vec2[] | null>(null)
  const [dog, setDog] = useState<Vec2[] | null>(null)
  const [eps, setEps] = useState(3)
  const [probe, setProbe] = useState<[number, number] | null>(null)
  const narrow = useMedia('(max-width: 720px)')
  const level = useMemo<WalkLevel | null>(
    () => (person && dog ? { id: 'own', person, dog, slack: 1.2 } : null),
    [person, dog],
  )
  const course = useMemo(() => (level ? makeCourse(level) : null), [level])
  const ghost = course && probe ? positions(course, probe[0], probe[1]) : null
  const redraw = () => {
    setPerson(null)
    setDog(null)
    setProbe(null)
  }
  return (
    <div className={styles.game}>
      <GameHeader
        title={t.title}
        subtitle={t.sandboxSubtitle}
        actions={
          <>
            <Button small={narrow} onClick={redraw}>
              {t.sandbox.redraw}
            </Button>
            <Button small={narrow} onClick={onBack}>
              {t.sandbox.back}
            </Button>
          </>
        }
      />
      <main className={styles.main}>
        <div className={styles.boardArea}>
          <Board bounds={PARK} padding={0.6} autoRotate label={t.modes.sandbox}>
            <rect
              x={PARK.minX}
              y={PARK.minY}
              width={PARK.maxX - PARK.minX}
              height={PARK.maxY - PARK.minY}
              rx={1}
              fill="var(--land-wash)"
              stroke="var(--ink-faint)"
              strokeWidth={0.06}
              strokeDasharray="0.5 0.3"
            />
            {person && (
              <polyline
                points={polyline(person)}
                fill="none"
                stroke="var(--person)"
                strokeWidth={0.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {dog && (
              <polyline
                points={polyline(dog)}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={0.2}
                strokeDasharray="0.4 0.3"
                strokeLinecap="round"
              />
            )}
            {person && <MapLabel at={person[0]!} text={t.person} />}
            {dog && <MapLabel at={dog[0]!} text={t.dog} />}
            {ghost && course && probe && (
              <>
                <LiveLeash
                  points={[ghost.person, ghost.dog]}
                  length={eps}
                  leash={leashAt(course, probe[0], probe[1])}
                  label={t.metres(leashAt(course, probe[0], probe[1]))}
                />
                <Walkers person={ghost.person} dog={ghost.dog} />
              </>
            )}
            {!dog && (
              <DrawLayer
                colour={person ? 'var(--ink)' : 'var(--person)'}
                onLine={(line) => {
                  if (!person) return setPerson(line)
                  setDog(line)
                  // Start the slider at the shortest leash, so the diagram shows a light way through.
                  setEps(roundUp(frechetDistance(person, line)))
                }}
              />
            )}
          </Board>
        </div>
        {course && (
          <TheoryPanel
            course={course}
            player={null}
            eps={eps}
            setEps={setEps}
            probe={probe}
            setProbe={setProbe}
            t={t}
            onClose={redraw}
          />
        )}
      </main>
      <footer className={styles.controls}>
        <p className={styles.sandboxHint} role="status">
          {!person ? t.sandbox.drawPerson : !dog ? t.sandbox.drawDog : t.sandbox.ready}
        </p>
        {level && (
          <Button variant="accent" onClick={() => onTry(level)}>
            {t.sandbox.tryIt}
          </Button>
        )}
      </footer>
    </div>
  )
}
