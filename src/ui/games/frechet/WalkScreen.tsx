import { useEffect, useMemo, useRef, useState } from 'react'
import { PARK, type Tier, type WalkId, type WalkLevel } from '../../../core/games/frechet/levels'
import {
  advice,
  leaderboardScore,
  leashAt,
  makeCourse,
  positions,
  starsFor,
  startState,
  step,
  stillPossible,
  TAUT_SHARE,
  type WalkState,
} from '../../../core/games/frechet/rules'
import { Board } from '../../components/Board'
import { Button } from '../../components/Button'
import { GameHeader } from '../../components/GameHeader'
import { HowToOverlay } from '../../components/HowToOverlay'
import { Overlay } from '../../components/Overlay'
import { ProgressBar } from '../../components/ProgressBar'
import { ResultScreen } from '../../components/ResultScreen'
import { useT } from '../../i18n'
import { useAnimationFrame, useHeldKeys, useKeyCapture } from '../../input/hooks'
import { keyboard } from '../../input/keyboard'
import { ExplanationDiagram } from './Explanation'
import styles from './Frechet.module.css'
import { KEYS, type Walker } from './helpers'
import { HoldControls } from './HoldControls'
import { HowToAnimation } from './HowToAnimation'
import type { FrechetTexts } from './i18n.de'
import { Leash, ParkScenery, PathLines, WalkedPaths, Walkers } from './ParkArt'
import { useProgress } from './store'
import { TheoryPanel } from './Theory'
import { useMedia } from './useMedia'

/** Pause between arriving (or the leash snapping) and the dialog, to see what happened. */
const DIALOG_DELAY_MS = 700
/** Longest frame step: after a stall the walkers must not jump past the leash check. */
const MAX_FRAME_S = 0.05

const ALL_CODES = [...KEYS.person, ...KEYS.dog]

/** Who should have waited when the leash snapped: the one whose step would not have shortened it. */
function snapReason(state: WalkState, course: ReturnType<typeof makeCourse>) {
  const now = leashAt(course, state.s, state.t)
  if (leashAt(course, state.s + 0.1, state.t) < now) return 'dogWait' as const
  if (leashAt(course, state.s, state.t + 0.1) < now) return 'personWait' as const
  return 'earlier' as const
}

interface WalkScreenProps {
  level: WalkLevel
  /** Position in the list of walks (0-based); null for paths drawn in the sandbox. */
  index: number | null
  /** Number of walks in the tier. */
  count: number
  /** The difficulty tier (hints name the key to hold only on the first easy walks). */
  tier?: Tier
  t: FrechetTexts
  onPicker: () => void
  onNext?: () => void
  onSandbox: () => void
}

/** One walk: person and dog walk while their keys or buttons are held; the leash must not snap. */
export function WalkScreen({
  level,
  index,
  count,
  tier = 'easy',
  t,
  onPicker,
  onNext,
  onSandbox,
}: WalkScreenProps) {
  const shell = useT()
  const progress = useProgress()
  const course = useMemo(() => makeCourse(level), [level])
  const [state, setState] = useState<WalkState>(() => startState(course))
  const stateRef = useRef(state)
  const [buttons, setButtons] = useState<Record<Walker, boolean>>({ person: false, dog: false })
  const [overlay, setOverlay] = useState<'howto' | 'result' | 'snapped' | null>(
    progress.seenHowTo || index === null ? null : 'howto',
  )
  const [theory, setTheory] = useState(false)
  const [eps, setEps] = useState(course.leash)
  const [probe, setProbe] = useState<[number, number] | null>(null)
  const touch = useMedia('(pointer: coarse)')
  const narrow = useMedia('(max-width: 720px)')
  const held = useHeldKeys()
  useKeyCapture(ALL_CODES)

  const isDown = (walker: Walker) => buttons[walker] || KEYS[walker].some((c) => keyboard.isDown(c))
  const shownHeld = {
    person: buttons.person || KEYS.person.some((c) => held.includes(c)),
    dog: buttons.dog || KEYS.dog.some((c) => held.includes(c)),
  }
  const playing = state.status === 'walking' && overlay === null

  useAnimationFrame((_, dtMs) => {
    const input = { person: isDown('person'), dog: isDown('dog') }
    if (!input.person && !input.dog) return
    const next = step(course, stateRef.current, input, Math.min(dtMs / 1000, MAX_FRAME_S))
    if (next !== stateRef.current) {
      stateRef.current = next
      setState(next)
    }
  }, playing)

  // Arrival or a snapped leash: a short pause, then the dialog.
  useEffect(() => {
    if (state.status === 'walking') return
    if (state.status === 'arrived' && index !== null) {
      progress.recordWin(course.level.id as WalkId, state.longest, starsFor(state.longest, course.shortest))
    }
    const timer = window.setTimeout(
      () => setOverlay(state.status === 'arrived' ? 'result' : 'snapped'),
      DIALOG_DELAY_MS,
    )
    return () => window.clearTimeout(timer)
    // Only when the status changes; progress is a stable store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status])

  const restart = () => {
    const fresh = startState(course)
    stateRef.current = fresh
    setState(fresh)
    setOverlay(null)
  }

  const leash = leashAt(course, state.s, state.t)
  const taut = leash >= TAUT_SHARE * course.leash
  const possible = useMemo(() => state.status !== 'walking' || stillPossible(course, state), [course, state])
  const hint = useMemo(
    () => (taut && possible ? advice(course, state) : null),
    [course, state, taut, possible],
  )
  const { person, dog } = positions(course, state.s, state.t)
  const ghost = probe ? positions(course, probe[0], probe[1]) : null
  const ghostLeash = probe ? leashAt(course, probe[0], probe[1]) : 0
  const tutorial = tier === 'easy' && index !== null && index < 2
  const name = index === null ? t.modes.sandbox : t.walks[course.level.id as WalkId]
  const stars = starsFor(state.longest, course.shortest)

  return (
    <div className={styles.game}>
      <GameHeader
        title={t.title}
        subtitle={
          index === null
            ? t.sandboxSubtitle
            : tier === 'easy'
              ? t.subtitle(index + 1, count, name)
              : t.subtitleTier(t.tiers[tier], index + 1, count, name)
        }
        status={
          <span className={styles.status}>
            <span className={styles.leashValue} data-testid="leash">
              {t.metres(leash)}
              <small>{t.leashOf(course.leash)}</small>
            </span>
            <ProgressBar
              value={leash / course.leash}
              color={taut ? 'var(--warn)' : 'var(--person)'}
              label={t.leashLabel}
              width={narrow ? 110 : 180}
            />
          </span>
        }
        actions={
          <>
            <Button small={narrow} onClick={() => setOverlay('howto')}>
              {shell.game.howTo}
            </Button>
            <Button small={narrow} selected={theory} aria-pressed={theory} onClick={() => setTheory(!theory)}>
              {t.theoryButton}
            </Button>
            <Button small={narrow} onClick={restart}>
              {t.restart}
            </Button>
            <Button small={narrow} onClick={onPicker}>
              {t.picker}
            </Button>
          </>
        }
      />
      <main className={styles.main}>
        <div
          className={styles.boardArea}
          data-testid="park"
          data-walk={`${state.s.toFixed(3)},${state.t.toFixed(3)}`}
        >
          <Board
            bounds={PARK}
            padding={0.6}
            autoRotate
            label={t.board(course.leash)}
            // The park is drawn once, in a layer of its own (the ink filter is slow to draw).
            under={
              <>
                <ParkScenery level={course.level} labels={{ start: t.start, goal: t.goal }} />
                <PathLines person={course.person} dog={course.dog} />
              </>
            }
          >
            <WalkedPaths person={course.person} dog={course.dog} s={state.s} t={state.t} />
            {ghost && (
              <>
                <Leash
                  from={ghost.person}
                  to={ghost.dog}
                  length={eps}
                  taut={ghostLeash > eps}
                  ghost
                  label={t.metres(ghostLeash)}
                />
                <Walkers person={ghost.person} dog={ghost.dog} ghost />
              </>
            )}
            <Leash
              from={person}
              to={dog}
              length={course.leash}
              taut={taut || state.status === 'snapped'}
              label={ghost ? undefined : t.metres(leash)}
            />
            <Walkers person={person} dog={dog} />
          </Board>
          {!possible && state.status === 'walking' && overlay === null && (
            <div className={styles.deadEnd} role="status">
              <span>{t.deadEnd}</span>
              <Button small onClick={restart}>
                {t.restart}
              </Button>
            </div>
          )}
          {possible && taut && state.status === 'walking' && overlay === null && (
            <div className={styles.bubble} role="status" data-testid="taut-hint">
              <strong>{t.taut}</strong>
              {tutorial &&
                (hint === 'person' || hint === 'dog') &&
                (touch ? t.adviceTouch[hint] : t.advice[hint])}
            </div>
          )}
        </div>
        {theory && (
          <TheoryPanel
            course={course}
            player={state.trace}
            eps={eps}
            setEps={setEps}
            probe={probe}
            setProbe={setProbe}
            t={t}
            onClose={() => {
              setTheory(false)
              setProbe(null)
            }}
            onSandbox={onSandbox}
          />
        )}
      </main>
      <HoldControls
        t={t}
        touch={touch}
        held={shownHeld}
        onHold={(walker, down) => setButtons((b) => ({ ...b, [walker]: down }))}
      />
      {overlay === 'howto' && (
        <HowToOverlay
          animation={
            <div className={styles.howTo}>
              <HowToAnimation label={t.howToAnimation} t={t} />
            </div>
          }
          keys={
            touch
              ? undefined
              : [
                  { codes: ['KeyA'], label: t.howToKeys.person },
                  { codes: ['KeyL'], label: t.howToKeys.dog },
                ]
          }
          onClose={() => {
            progress.setSeenHowTo()
            setOverlay(null)
          }}
        >
          {t.howTo(course.leash, touch).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </HowToOverlay>
      )}
      {overlay === 'snapped' && (
        <Overlay
          title={t.snappedTitle}
          onClose={restart}
          actions={
            <>
              <Button
                onClick={() => {
                  setOverlay(null)
                  setTheory(true)
                }}
              >
                {t.theoryButton}
              </Button>
              <Button variant="accent" data-autofocus onClick={restart}>
                {shell.game.again}
              </Button>
            </>
          }
        >
          <p className={styles.sandboxHint}>{t.snapped[snapReason(state, course)]}</p>
        </Overlay>
      )}
      {overlay === 'result' && (
        <ResultScreen
          outcome="won"
          stars={stars}
          stats={t.stats(state.longest, course.shortest)}
          explanation={t.explanation(course.shortest, state.longest).join(' ')}
          animation={<ExplanationDiagram course={course} player={state.trace} t={t} />}
          onTheory={() => {
            setOverlay(null)
            setTheory(true)
          }}
          leaderboard={
            index === null
              ? undefined
              : {
                  board: `frechet/${course.level.id}`,
                  spec: { higherIsBetter: false },
                  score: leaderboardScore(state.longest),
                  format: t.score,
                }
          }
          onAgain={restart}
          onNext={onNext}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  )
}
