import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tier } from '../../../../core/games/frechet/levels'
import { coils, ropePoints } from '../../../../core/games/frechet/woods/rope'
import { starsFor, leaderboardScore, TAUT_SHARE } from '../../../../core/games/frechet/rules'
import type { WoodsWalk } from '../../../../core/games/frechet/woods/levels'
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
import { FollowCamera } from '../FollowCamera'
import { strainOf, towards } from '../leashShape'
import { KEYS, type Walker } from '../helpers'
import { HoldControls } from '../HoldControls'
import type { FrechetTexts } from '../i18n.de'
import { Paths, Walkers } from '../ParkArt'
import { useMedia } from '../useMedia'
import type { WoodsTexts } from './i18n.de'
import { useWoodsProgress } from './store'
import { ShorterLeash } from '../ShorterLeash'
import { StartWinding } from './StartWinding'
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
  // On a walk with a free start leash, the course depends on how the leash is wound at the gate.
  const [course, setCourse] = useState(() => makeWoodsCourse(walk))
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

  // "Kürzere Leine": the same walk again with a shorter leash.
  const [challenge, setChallenge] = useState<number | null>(null)
  const withLeash = (leash: number | null) => (leash === null ? walk : { ...walk, leash })

  const tryShorter = (leash: number) => {
    setChallenge(leash)
    const next = makeWoodsCourse(withLeash(leash), course.winding)
    const fresh = woodsStart(next)
    setCourse(next)
    stateRef.current = fresh
    setState(fresh)
    setOverlay(null)
  }

  /** Free start: wind the leash round the gate post (only before the first step). */
  const chooseStart = (winding: number) => {
    const next = makeWoodsCourse(withLeash(challenge), winding)
    const fresh = woodsStart(next)
    setCourse(next)
    stateRef.current = fresh
    setState(fresh)
  }

  const leash = leashOf(course, state.rope)
  const taut = leash >= TAUT_SHARE * course.leash
  const caught = state.rope.wraps.length > 0
  const trunkCentres = useMemo(() => course.trees.map((tree) => tree.centre), [course])
  const touched = useMemo(() => new Set(state.rope.wraps.map((x) => x.tree)), [state.rope])
  // The most turns the leash makes round one post (0 while it only bends round trunks).
  const coiled = useMemo(
    () => coils(state.rope, course.trees).reduce((most, c) => Math.max(most, Math.abs(c.turns)), 0),
    [state.rope, course.trees],
  )
  const atStart = state.s === 0 && state.t === 0
  // The start panel of a free start leash, while both stand at the gate.
  const choosing = !!walk.freeStart && atStart && state.status === 'walking' && overlay === null
  const possible = useMemo(
    // Not judged while the start is being chosen: the dead end would give the answer away.
    () => choosing || state.status !== 'walking' || stillPossibleInWoods(course, state),
    [course, state, choosing],
  )
  const hint = useMemo(
    () => (taut && possible ? woodsAdvice(course, state) : null),
    [course, state, taut, possible],
  )
  const { person, dog } = woodsPositions(course, state.s, state.t)
  // Which way the leash pulls at each end: towards its first and last bend.
  const pull = useMemo(() => {
    const pts = ropePoints(state.rope, course.trees)
    return {
      person: towards(pts[0]!, pts[1]!),
      dog: towards(pts[pts.length - 1]!, pts[pts.length - 2]!),
      strain: strainOf(leashOf(course, state.rope) / course.leash),
    }
  }, [state.rope, course])
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
          <FollowCamera
            enabled={!theory}
            leash={course.leash}
            person={course.person}
            dog={course.dog}
            at={[state.s, state.t]}
            marks={trunkCentres}
            label={w.board(course.leash)}
          >
            <WoodsScenery walk={walk} leash={course.leash} labels={{ start: t.start, goal: t.goal }} />
            <Paths person={course.person} dog={course.dog} s={state.s} t={state.t} />
            <Trunks trees={course.trees} trunks={walk.trunks} touched={touched} />
            {ghost && (
              <>
                <RopeLeash
                  rope={ghost.rope}
                  trees={course.trees}
                  length={eps}
                  ghost
                  label={t.metres(ghost.leash)}
                />
                <Walkers person={ghost.person} dog={ghost.dog} ghost />
              </>
            )}
            <RopeLeash
              rope={state.rope}
              trees={course.trees}
              length={course.leash}
              snapped={state.status === 'snapped'}
              label={ghost ? undefined : t.metres(leash)}
            />
            <Walkers person={person} dog={dog} pull={state.status === 'walking' ? pull : undefined} />
          </FollowCamera>
          {!possible && state.status === 'walking' && overlay === null && (
            <div className={styles.deadEnd} role="status">
              <span>{t.deadEnd}</span>
              <Button small onClick={restart}>
                {t.restart}
              </Button>
            </div>
          )}
          {choosing && (
            <StartWinding winding={course.winding} length={leash} onChange={chooseStart} t={t} w={w} />
          )}
          {!choosing &&
            possible &&
            (taut || coiled > 0) &&
            state.status === 'walking' &&
            overlay === null && (
              <div className={styles.bubble} role="status" data-testid="taut-hint">
                <strong>{taut ? t.taut : w.coiledTitle(coiled)}</strong>
                {walk.before && atStart ? (
                  <span>{w.tied} </span>
                ) : coiled > 0 ? (
                  <span>{w.coiled(coiled)} </span>
                ) : (
                  caught && <span>{w.caught} </span>
                )}
                {tutorial &&
                  (hint === 'person' || hint === 'dog') &&
                  (touch ? t.adviceTouch[hint] : t.advice[hint])}
              </div>
            )}
        </div>
        {theory && (
          <WoodsTheory
            walk={walk}
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
          {[...w.howTo(course.leash, touch), ...(walk.freeStart ? [w.start.howTo] : [])].map((line) => (
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
            {coiled > 0
              ? w.snappedCoil(coiled)
              : reason === 'tree'
                ? w.snappedTree
                : reason
                  ? t.snapped[reason]
                  : null}
          </p>
        </Overlay>
      )}
      {overlay === 'result' && (
        <ResultScreen
          outcome="won"
          stars={stars}
          stats={
            <>
              {w.stats(state.longest, course.shortest, course.plain)}
              <ShorterLeash leash={course.leash} shortest={course.shortest} onTry={tryShorter} t={t} />
            </>
          }
          explanation={[
            ...w.explanation(course.shortest, state.longest),
            ...(walk.freeStart ? [w.start.explanation(w.start.short(walk.bestStart ?? 0))] : []),
          ].join(' ')}
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
