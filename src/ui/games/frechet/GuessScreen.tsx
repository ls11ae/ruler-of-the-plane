import { useMemo, useState } from 'react'
import { decide, walkFor, type Walk } from '../../../core/games/frechet/frechet'
import { PARK, type WalkId, type WalkLevel } from '../../../core/games/frechet/levels'
import { guessStars, leashAt, makeCourse, positions, type Course } from '../../../core/games/frechet/rules'
import { Board } from '../../components/Board'
import { Button } from '../../components/Button'
import { GameHeader } from '../../components/GameHeader'
import { HowToOverlay } from '../../components/HowToOverlay'
import { ResultScreen } from '../../components/ResultScreen'
import { useT } from '../../i18n'
import { useAnimationFrame } from '../../input/hooks'
import { ExplanationDiagram } from './Explanation'
import styles from './Frechet.module.css'
import type { FrechetTexts } from './i18n.de'
import { LeashSlider } from './LeashSlider'
import { Leash, ParkScenery, PathLines, WalkedPaths, Walkers } from './ParkArt'
import { sliderMax } from './helpers'
import { useMedia } from './useMedia'

/** How long the computer's walk takes on screen. */
const WALK_MS = 3500

/** Positions along a walk at a share f of its length (in the diagram, both arc lengths together). */
function along(walk: Walk, f: number): [number, number] {
  const lengths = walk.slice(1).map(([s, t], i) => Math.hypot(s - walk[i]![0], t - walk[i]![1]))
  let rest = f * lengths.reduce((a, b) => a + b, 0)
  for (let i = 0; i < lengths.length; i++) {
    const l = lengths[i]!
    if (rest <= l || i === lengths.length - 1) {
      const u = l > 0 ? Math.min(1, rest / l) : 1
      const [s0, t0] = walk[i]!
      const [s1, t1] = walk[i + 1]!
      return [s0 + u * (s1 - s0), t0 + u * (t1 - t0)]
    }
    rest -= l
  }
  return walk[walk.length - 1]!
}

/** The first share of the walk where the leash gets longer than eps (1 if never). */
function firstTooLong(course: Course, walk: Walk, eps: number): number {
  const samples = 600
  for (let k = 0; k <= samples; k++) {
    const [s, t] = along(walk, k / samples)
    if (leashAt(course, s, t) > eps) return k / samples
  }
  return 1
}

interface Try {
  leash: number
  ok: boolean
}

/**
 * "Schätz die Leine": the player picks a leash length; the computer checks whether a walk exists and
 * walks it, or walks the best walk until the leash gets too taut.
 */
export function GuessScreen({
  level,
  t,
  onPicker,
}: {
  level: WalkLevel
  t: FrechetTexts
  onPicker: () => void
}) {
  const shell = useT()
  const course = useMemo(() => makeCourse(level), [level])
  const max = sliderMax(course.shortest, course.leash)
  const [guess, setGuess] = useState(() => Math.round(max * 5) / 10)
  const [tries, setTries] = useState<Try[]>([])
  const [run, setRun] = useState<{
    walk: Walk
    stop: number
    ok: boolean
    leash: number
    start: number
  } | null>(null)
  const [share, setShare] = useState(0)
  const [overlay, setOverlay] = useState<'intro' | 'result' | null>('intro')
  const narrow = useMedia('(max-width: 720px)')
  const running = run !== null && share < run.stop

  useAnimationFrame((now) => {
    if (!run) return
    setShare(Math.min(run.stop, (now - run.start) / WALK_MS))
  }, running)

  const check = () => {
    const leash = Math.round(guess * 100) / 100
    const ok = decide(course.person.points, course.dog.points, leash)
    const walk = ok ? walkFor(course.person.points, course.dog.points, leash)! : course.computer
    setRun({ walk, ok, leash, stop: ok ? 1 : firstTooLong(course, walk, leash), start: performance.now() })
    setShare(0)
    setTries((list) => [...list, { leash, ok }])
  }

  const at = run ? along(run.walk, share) : ([0, 0] as [number, number])
  const { person, dog } = positions(course, at[0], at[1])
  const leash = leashAt(course, at[0], at[1])
  const done = run !== null && !running
  const best = tries
    .filter((x) => x.ok)
    .reduce<number | null>((b, x) => (b === null || x.leash < b ? x.leash : b), null)
  const stars = guessStars(best, course.shortest)

  return (
    <div className={styles.game}>
      <GameHeader
        title={t.title}
        subtitle={`${t.guess.title} · ${t.walks[level.id as WalkId]}`}
        status={<span className={styles.tries}>{t.guess.tries(tries.length)}</span>}
        actions={
          <>
            <Button small={narrow} onClick={() => setOverlay('intro')}>
              {shell.game.howTo}
            </Button>
            <Button
              small={narrow}
              onClick={() => {
                setTries([])
                setRun(null)
              }}
            >
              {t.restart}
            </Button>
            <Button small={narrow} onClick={onPicker}>
              {t.picker}
            </Button>
          </>
        }
      />
      <main className={styles.main}>
        <div className={styles.boardArea}>
          <Board
            bounds={PARK}
            padding={0.6}
            autoRotate
            label={t.guess.title}
            // The park is drawn once, in a layer of its own (the ink filter is slow to draw).
            under={
              <>
                <ParkScenery level={level} labels={{ start: t.start, goal: t.goal }} />
                <PathLines person={course.person} dog={course.dog} />
              </>
            }
          >
            <WalkedPaths person={course.person} dog={course.dog} s={at[0]} t={at[1]} />
            <Leash
              from={person}
              to={dog}
              length={run?.leash ?? guess}
              taut={run !== null && (!run.ok && done ? true : leash >= 0.85 * run.leash)}
              label={t.metres(leash)}
            />
            <Walkers person={person} dog={dog} />
          </Board>
        </div>
      </main>
      <footer className={styles.guessBar}>
        <LeashSlider
          label={t.guess.slider(guess)}
          value={guess}
          min={0}
          max={max}
          onChange={setGuess}
          good={tries.filter((x) => x.ok).map((x) => x.leash)}
          bad={tries.filter((x) => !x.ok).map((x) => x.leash)}
        />
        <Button variant="accent" onClick={check} disabled={running}>
          {running ? t.guess.checking : t.guess.check}
        </Button>
        <Button onClick={() => setOverlay('result')} disabled={running || tries.length === 0}>
          {t.guess.reveal}
        </Button>
        {done && run && (
          <p className={styles.guessMessage} role="status" data-testid="guess-message">
            {run.ok ? t.guess.works(run.leash) : t.guess.fails(run.leash)}
          </p>
        )}
      </footer>
      {overlay === 'intro' && (
        <HowToOverlay onClose={() => setOverlay(null)}>
          <p>{t.guess.intro}</p>
        </HowToOverlay>
      )}
      {overlay === 'result' && (
        <ResultScreen
          outcome={best === null ? 'lost' : 'won'}
          stars={stars}
          stats={t.guess.stats(best, course.shortest)}
          explanation={t.guess.explanation(course.shortest).join(' ')}
          animation={<ExplanationDiagram course={course} player={null} eps={course.shortest} t={t} />}
          onAgain={() => {
            setTries([])
            setRun(null)
            setOverlay(null)
          }}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  )
}
