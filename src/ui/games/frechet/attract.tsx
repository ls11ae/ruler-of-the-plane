import { useEffect, useMemo, useState } from 'react'
import type { Walk } from '../../../core/games/frechet/frechet'
import { PARK, walkById, type WalkId, type WalkLevel } from '../../../core/games/frechet/levels'
import { leashAt, makeCourse, positions, TAUT_SHARE } from '../../../core/games/frechet/rules'
import { Board } from '../../components/Board'
import { useLocalized } from '../../i18n'
import { useAnimationFrame } from '../../input/hooks'
import type { AttractProps } from '../registry'
import styles from './Attract.module.css'
import { FreeSpaceDiagram } from './FreeSpaceDiagram'
import { de, type FrechetTexts } from './i18n.de'
import { en } from './i18n.en'
import { Leash, ParkScenery, Paths, Walkers } from './ParkArt'

/** Walks of the demo, one per round: each makes someone wait. */
const DEMO_WALKS: readonly WalkId[] = ['pond', 'fetch', 'sniffing', 'braid']
const INTRO_MS = 800
const WALK_MS = 16_000
const END_MS = 3000

/**
 * The part of a walk up to share u (0–1) of its length in the diagram (both axes scaled to 1); its
 * last point is where person and dog are.
 */
function walkedPart(walk: Walk, sx: number, sy: number, u: number): Walk {
  const seg = walk.slice(1).map(([s, t], i) => Math.hypot((s - walk[i]![0]) / sx, (t - walk[i]![1]) / sy))
  let left = u * seg.reduce((a, b) => a + b, 0)
  for (const [i, l] of seg.entries()) {
    if (left <= l && l > 0) {
      const f = left / l
      const [s0, t0] = walk[i]!
      const [s1, t1] = walk[i + 1]!
      return [...walk.slice(0, i + 1), [s0 + f * (s1 - s0), t0 + f * (t1 - t0)]]
    }
    left -= l
  }
  return walk
}

function Demo({ level, t, onDone }: { level: WalkLevel; t: FrechetTexts; onDone: () => void }) {
  const course = useMemo(() => makeCourse(level), [level])
  const [start] = useState(() => performance.now())
  const [time, setTime] = useState(0)
  const total = INTRO_MS + WALK_MS + END_MS
  useAnimationFrame((now) => setTime(now - start), time < total)
  const over = time >= total
  useEffect(() => {
    if (over) onDone()
  }, [over, onDone])

  const u = Math.min(1, Math.max(0, (time - INTRO_MS) / WALK_MS))
  const walked = walkedPart(course.computer, course.person.length, course.dog.length, u)
  const [s, tt] = walked.at(-1)!
  const { person, dog } = positions(course, s, tt)
  const taut = leashAt(course, s, tt) >= TAUT_SHARE * course.leash
  return (
    <div className={styles.demo} data-step={Math.round(u * 50)}>
      <div className={styles.park}>
        <Board bounds={PARK} padding={0.6} autoRotate>
          <ParkScenery level={course.level} labels={{ start: t.start, goal: t.goal }} />
          <Paths person={course.person} dog={course.dog} s={s} t={tt} />
          <Leash from={person} to={dog} length={course.leash} taut={taut} />
          <Walkers person={person} dog={dog} />
        </Board>
      </div>
      <div className={styles.diagram}>
        <FreeSpaceDiagram
          person={course.person}
          dog={course.dog}
          eps={course.leash}
          walks={[{ walk: walked, kind: 'player' }]}
          probe={[s, tt]}
          label={t.explanationAnimation}
          axes={{ person: t.person, dog: t.dog }}
        />
      </div>
    </div>
  )
}

/**
 * Attract demo of "Gassi gehen": the computer walks person and dog to the castle with the shortest
 * leash, and the diagram of positions draws its walk alongside (light where the leash reaches). A
 * different walk each round.
 */
export default function FrechetAttract({ round, onDone }: AttractProps) {
  const t = useLocalized({ de, en })
  const level = walkById(DEMO_WALKS[round % DEMO_WALKS.length]!)
  return <Demo key={level.id} level={level} t={t} onDone={onDone} />
}
