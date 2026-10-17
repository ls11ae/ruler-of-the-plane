import { useEffect, useMemo, useRef, useState } from 'react'
import { PARK, type Tier } from '../../../../core/games/frechet/levels'
import { starsFor, leaderboardScore, TAUT_SHARE } from '../../../../core/games/frechet/rules'
import type { WoodsWalk } from '../../../../core/games/frechet/woods/levels'
import { ropePoints } from '../../../../core/games/frechet/woods/rope'
import {
  leashOf,
  makeWoodsCourse,
  ropeAt,
  stepWoods,
  stillPossibleInWoods,
  woodsAdvice,
  woodsPositions,
  woodsSnapReason,
  woodsStart,
  type WoodsState,
} from '../../../../core/games/frechet/woods/rules'
import { Board } from '../../../components/Board'
import { Button } from '../../../components/Button'
import { GameHeader } from '../../../components/GameHeader'
import { HowToOverlay } from '../../../components/HowToOverlay'
import { Overlay } from '../../../components/Overlay'
import { ProgressBar } from '../../../components/ProgressBar'
import { ResultScreen } from '../../../components/ResultScreen'
import { useT } from '../../../i18n'
import { useAnimationFrame, useHeldKeys, useKeyCapture } from '../../../input/hooks'
import { keyboard } from '../../../input/keyboard'
import styles from '../Frechet.module.css'
import { KEYS, type Walker } from '../helpers'
import { HoldControls } from '../HoldControls'
import type { FrechetTexts } from '../i18n.de'
import { Paths, Walkers } from '../ParkArt'
import { useMedia } from '../useMedia'
import type { WoodsTexts } from './i18n.de'
import { useWoodsProgress } from './store'
import { RopeLeash, Trunks, WoodsScenery } from './WoodsArt'
import { WoodsExplanation } from './WoodsExplanation'
import { WoodsHowToAnimation } from './WoodsHowTo'
import { WoodsTheory } from './WoodsTheory'

/** Pause between arriving (or the leash snapping) and the dialog, to see what happened. */
const DIALOG_DELAY_MS = 700
/** Longest frame step: after a stall the walkers must not jump past the leash check. */
const MAX_FRAME_S = 0.05

const ALL_CODES = [...KEYS.person, ...KEYS.dog]

interface WoodsScreenProps {
  walk: WoodsWalk
  /** Position in the tier's list of woods walks (0-based). */
  index: number
  count: number
  /** The difficulty tier (hints name the key to hold only on the easy woods walks). */
  tier?: Tier
  t: FrechetTexts
  w: WoodsTexts
  onPicker: () => void
  onNext?: () => void
}

/** A walk in the woods: as in the park, but the leash catches on the trunks and winds around them. */
export function WoodsScreen({ walk, index, count, tier = 'easy', t, w, onPicker, onNext }: WoodsScreenProps) {
  const shell = useT()
  const progress = useWoodsProgress()
  const course = useMemo(() => makeWoodsCourse(walk), [walk])
  const [state, setState] = useState<WoodsState>(() => woodsStart(course))
  const stateRef = useRef(state)
  const [buttons, setButtons] = useState<Record<Walker, boolean>>({ person: false, dog: false })
  const [overlay, setOverlay] = useState<'howto' | 'result' | 'snapped' | null>(
    progress.seenHowTo ? null : 'howto',
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
    const next = stepWoods(course, stateRef.current, input, Math.min(dtMs / 1000, MAX_FRAME_S))
    if (next !== stateRef.current) {
      stateRef.current = next
      setState(next)
    }
  }, playing)

  // Arrival or a snapped leash: a short pause, then the dialog.
  useEffect(() => {
    if (state.status === 'walking') return
    if (state.status === 'arrived') {
      progress.recordWin(walk.id, state.longest, starsFor(state.longest, course.shortest))
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
    const fresh = woodsStart(course)
    stateRef.current = fresh
    setState(fresh)
    setOverlay(null)
  }

  const leash = leashOf(course, state.rope)
  const taut = leash >= TAUT_SHARE * course.leash
  const caught = state.rope.wraps.length > 0
  const touched = useMemo(() => new Set(state.rope.wraps.map((x) => x.tree)), [state.rope])
  const possible = useMemo(
    () => state.status !== 'walking' || stillPossibleInWoods(course, state),
    [course, state],
  )
  const hint = useMemo(
    () => (taut && possible ? woodsAdvice(course, state) : null),
    [course, state, taut, possible],
  )
  const { person, dog } = woodsPositions(course, state.s, state.t)
  const ghost = useMemo(() => {
    if (!probe) return null
    const rope = ropeAt(course, probe[0], probe[1])
    return { ...woodsPositions(course, probe[0], probe[1]), rope, leash: leashOf(course, rope) }
  }, [course, probe])
  const tutorial = tier === 'easy' && index < count - 1
  const stars = starsFor(state.longest, course.shortest)
  const reason = state.status === 'snapped' ? woodsSnapReason(course, state) : null

  return (
    <div className={styles.game}>
      <GameHeader
        title={t.title}
        subtitle={
          tier === 'easy'
            ? w.subtitle(index + 1, count, w.walks[walk.id])
            : w.subtitleTier(t.tiers[tier], index + 1, count, w.walks[walk.id])
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
          data-caught={caught || undefined}
        >
          <Board bounds={PARK} padding={0.6} autoRotate label={w.board(course.leash)}>
            <WoodsScenery walk={walk} leash={course.leash} labels={{ start: t.start, goal: t.goal }} />
            <Paths person={course.person} dog={course.dog} s={state.s} t={state.t} />
            <Trunks trees={course.trees} touched={touched} />
            {ghost && (
              <>
                <RopeLeash
                  points={ropePoints(ghost.rope, course.trees)}
                  length={eps}
                  taut={ghost.leash > eps}
                  ghost
                  label={t.metres(ghost.leash)}
                />
                <Walkers person={ghost.person} dog={ghost.dog} ghost />
              </>
            )}
            <RopeLeash
              points={ropePoints(state.rope, course.trees)}
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
              {caught && <span>{w.caught} </span>}
              {tutorial &&
                (hint === 'person' || hint === 'dog') &&
                (touch ? t.adviceTouch[hint] : t.advice[hint])}
            </div>
          )}
        </div>
        {theory && (
          <WoodsTheory
            course={course}
            player={state.trace}
            eps={eps}
            setEps={setEps}
            probe={probe}
            setProbe={setProbe}
            t={t}
            w={w}
            onClose={() => {
              setTheory(false)
              setProbe(null)
            }}
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
              <WoodsHowToAnimation label={w.howToAnimation} t={t} />
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
          {w.howTo(course.leash, touch).map((line) => (
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
          <p className={styles.sandboxHint}>
            {reason === 'tree' ? w.snappedTree : reason ? t.snapped[reason] : null}
          </p>
        </Overlay>
      )}
      {overlay === 'result' && (
        <ResultScreen
          outcome="won"
          stars={stars}
          stats={w.stats(state.longest, course.shortest, course.plain)}
          explanation={w.explanation(course.shortest, state.longest).join(' ')}
          animation={<WoodsExplanation course={course} player={state.trace} t={t} w={w} />}
          onTheory={() => {
            setOverlay(null)
            setTheory(true)
          }}
          leaderboard={{
            board: `frechet/woods-${walk.id}`,
            spec: { higherIsBetter: false },
            score: leaderboardScore(state.longest),
            format: t.score,
          }}
          onAgain={restart}
          onNext={onNext}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  )
}
