import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { MARGIN, MowingRound } from '../../../core/games/lawn-mowing/game'
import { lowerBound, makeLawn } from '../../../core/games/lawn-mowing/mowing'
import { HOME_STEP_MS, starsFor } from '../../../core/games/lawn-mowing/rules'
import { stripTours } from '../../../core/games/lawn-mowing/strips'
import { tourLength } from '../../../core/games/lawn-mowing/tour'
import type { Vec2 } from '../../../core/geometry/types'
import type { LawnMowingLevel } from '../../../core/levels/schema'
import { Board } from '../../components/Board'
import { useBoard } from '../../components/boardContext'
import { Button } from '../../components/Button'
import { GameHeader } from '../../components/GameHeader'
import { HowToOverlay, type KeyHint } from '../../components/HowToOverlay'
import { ProgressBar } from '../../components/ProgressBar'
import { ResultScreen } from '../../components/ResultScreen'
import { useLocalized, useT } from '../../i18n'
import { useLevel } from '../../levels'
import { toLawn, UNDO_KEYS, useCutterControls, type PadHold, type ScreenDirection } from './controls'
import { CutterTokens, Tours, type CutterView } from './Cutters'
import { DPad } from './DPad'
import { boardBounds } from './geometry'
import { HowToAnimation } from './HowToAnimation'
import { de, type LawnTexts } from './i18n.de'
import { en } from './i18n.en'
import { LawnBase, LawnOutline, Mowed, Paper } from './LawnArt'
import styles from './LawnMowing.module.css'
import { CutterCard, HomeCard, LongestCard, PhoneStats } from './Panels'
import { SetupOverlay } from './SetupOverlay'
import { usePrefs, type Setup } from './store'
import { TheoryPanel } from './Theory'
import { TourAnimation } from './TourAnimation'
import { useMedia } from './useMedia'

/** Pause between the last cutter arriving home and the result, to see the finished lawn. */
const RESULT_DELAY_MS = 900

/** The keys shown in "So geht's" (none on a phone: it has the direction pad). */
function howToKeys(t: LawnTexts, cutters: number, phone: boolean): KeyHint[] | undefined {
  if (phone) return undefined
  return [
    { codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], label: t.howToKeys.one },
    ...(cutters > 1
      ? [{ codes: ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], label: t.howToKeys.two }]
      : []),
    { codes: ['Space'], label: t.howToKeys.home },
    { codes: UNDO_KEYS.slice(0, cutters).map((keys) => keys[0]!), label: t.howToKeys.undo },
  ]
}

/** Reports the board's rotation (keys and the pad mean screen directions). */
function RotationProbe({ onChange }: { onChange: (rotation: 0 | 90) => void }) {
  const { rotation } = useBoard()
  useEffect(() => onChange(rotation), [rotation, onChange])
  return null
}

function Round({
  level,
  setup,
  t,
  onNew,
}: {
  level: LawnMowingLevel
  setup: Setup
  t: LawnTexts
  onNew: () => void
}) {
  const shell = useT()
  const prefs = usePrefs()
  const phone = useMedia('(pointer: coarse)')
  const narrow = useMedia('(max-width: 720px)')
  const k = setup.cutters
  const lawn = useMemo(() => makeLawn(level.outer, level.holes, level.cutter, level.cutterCenter), [level])
  const variant = level.variants.find((v) => v.cutters === k)
  const solution = variant?.solution
  const strips = useMemo(() => stripTours(lawn, k), [lawn, k])
  const stripLength = Math.max(...strips.map(tourLength))
  // Cutters start on the first point of the solver's tours (so its target is reachable), else of the strips.
  const starts = useMemo<Vec2[]>(
    () => (solution?.tours ?? strips).map((tour) => tour[0]!),
    [solution, strips],
  )
  const [round] = useState(() => new MowingRound(lawn, starts))
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const [phase, setPhase] = useState<'play' | 'home' | 'done'>('play')
  const [overlay, setOverlay] = useState<'howto' | 'result' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [theory, setTheory] = useState(false)
  const [rotation, setRotation] = useState<0 | 90>(0)
  const pad = useRef<PadHold | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const announced = useRef(false)

  const flash = (text: string, ms = 2600) => {
    setNotice(text)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), ms)
  }
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const step = (i: number, direction: ScreenDirection) => {
    if (round.step(i, toLawn(direction, rotation)) === null) return
    redraw()
    if (round.mowing.done && !announced.current) {
      announced.current = true
      flash(t.allMowed, 4000)
    }
  }

  // A step back (undo key or the pad's middle button): only while driving, not on the way home or after
  // the round. After a "Feierabend" that left grass, it takes the way home back step by step too.
  const undo = (i: number) => {
    if (phase !== 'play' || round.undo(i) === null) return
    if (!round.mowing.done) announced.current = false
    redraw()
  }

  const goHome = () => {
    if (phase !== 'play') return
    pad.current = null
    setPhase('home')
  }

  // "Feierabend": every cutter drives home on a shortest way, one step per tick, all at once.
  useEffect(() => {
    if (phase !== 'home') return
    const ways = round.cutters.map((_, i) => round.wayHome(i))
    let tick = 0
    const timer = window.setInterval(() => {
      ways.forEach((way, i) => {
        const p = way[tick]
        if (p) round.moveTo(i, p)
      })
      tick++
      redraw()
      if (ways.every((w) => tick >= w.length)) {
        window.clearInterval(timer)
        if (round.mowing.done) setPhase('done')
        else {
          setPhase('play')
          flash(t.notDone(round.mowing.total - round.mowing.count))
        }
      }
    }, HOME_STEP_MS)
    return () => window.clearInterval(timer)
    // Runs once per press of "Feierabend".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // All home and all mowed: the result, after a moment to see the finished lawn.
  useEffect(() => {
    if (phase !== 'done') return
    window.clearTimeout(noticeTimer.current)
    const timer = window.setTimeout(() => {
      setNotice(null)
      setOverlay('result')
    }, RESULT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  const { padDown } = useCutterControls({
    cutters: k,
    active: phase === 'play' && overlay === null,
    pad,
    onStep: step,
    onHome: goHome,
    onUndo: undo,
  })
  const onPad = (direction: ScreenDirection, down: boolean) => {
    if (down) {
      pad.current = { direction, since: performance.now() }
      padDown(direction)
    } else if (pad.current?.direction === direction) pad.current = null
  }

  const views: CutterView[] = round.cutters.map((c, i) => ({
    start: c.start,
    at: c.at,
    walk: c.walk,
    home: phase === 'play' ? round.wayHome(i) : [],
  }))
  const mowedCells = lawn.cells.cells().filter(([x, y]) => round.mowing.isMowed(x, y))
  const share = round.mowing.count / round.mowing.total
  const percent = round.mowing.done ? 100 : Math.min(99, Math.floor(share * 100))
  const longest = round.longest()
  const target = solution ? t.target(solution.maxTourLength) : t.targetStrips(stripLength)
  const bounds = boardBounds(level, MARGIN + 1)
  const lawnNumber = level.number
  const result = starsFor(longest, {
    length: solution?.maxTourLength ?? stripLength,
    solver: solution !== undefined,
  })
  const tours = solution?.tours ?? strips

  return (
    <div
      className={styles.game}
      data-mowed={round.mowing.count}
      data-phase={phase}
      data-cutters={round.cutters.map((c) => c.at.join(',')).join(';')}
    >
      <GameHeader
        title={t.title}
        subtitle={t.subtitle(lawnNumber, k)}
        status={
          <span className={styles.status}>
            <span className={styles.percent} data-testid="mowed-percent">
              {percent} %<small>{t.mowed}</small>
            </span>
            <ProgressBar value={percent / 100} label={t.mowedLabel} width={narrow ? 110 : 200} />
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
            <Button small={narrow} onClick={onNew}>
              {t.newGame}
            </Button>
          </>
        }
      />
      <main className={styles.main}>
        <div className={styles.boardArea}>
          <Board bounds={bounds} padding={0} autoRotate label={t.board(t.lawns[level.name] ?? level.name)}>
            <RotationProbe onChange={setRotation} />
            <Paper bounds={bounds} />
            <LawnBase level={level} />
            <Mowed cells={mowedCells} />
            <LawnOutline level={level} />
            <Tours lawn={lawn} cutters={views} />
            <CutterTokens lawn={lawn} cutters={views} />
          </Board>
          {notice && (
            <div className={styles.notice} role="status">
              {notice}
            </div>
          )}
        </div>
        {theory && (
          <TheoryPanel
            level={level}
            lawn={lawn}
            cutters={k}
            tours={tours}
            solver={solution?.maxTourLength}
            stripLength={stripLength}
            t={t}
            onClose={() => setTheory(false)}
          />
        )}
      </main>
      {phone ? (
        <footer className={`${styles.panels} ${styles.phone}`}>
          <DPad onHold={onPad} onUndo={() => undo(0)} t={t} />
          <div className={styles.phoneSide}>
            <PhoneStats stats={{ steps: round.steps(0), home: round.stepsHome(0) }} target={target} t={t} />
            <HomeCard
              onHome={goHome}
              keys={false}
              urgent={round.mowing.done && phase === 'play'}
              disabled={phase !== 'play'}
              t={t}
            />
          </div>
        </footer>
      ) : (
        <footer className={styles.panels}>
          <div className={styles.cards}>
            {round.cutters.map((_, i) => (
              <CutterCard
                key={i}
                index={i as 0 | 1}
                stats={{ steps: round.steps(i), home: round.stepsHome(i) }}
                keys
                t={t}
              />
            ))}
            <LongestCard longest={longest} single={k === 1} target={target} t={t} />
          </div>
          <HomeCard
            onHome={goHome}
            keys
            urgent={round.mowing.done && phase === 'play'}
            disabled={phase !== 'play'}
            t={t}
          />
        </footer>
      )}
      {overlay === 'howto' && (
        <HowToOverlay
          animation={<HowToAnimation label={t.howToAnimation} />}
          keys={howToKeys(t, k, phone)}
          onClose={() => {
            prefs.setSeenHowTo()
            setOverlay(null)
          }}
        >
          {t.howTo(k).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </HowToOverlay>
      )}
      {overlay === 'result' && (
        <ResultScreen
          outcome="won"
          title={t.result.title}
          stars={result.stars}
          record={result.record}
          stats={t.result.stats(longest, target)}
          explanation={t.explanation(lowerBound(lawn, k)).join(' ')}
          animation={
            <TourAnimation
              level={level}
              lawn={lawn}
              tours={tours}
              label={t.explanationAnimation}
              replay={t.replay}
            />
          }
          onTheory={() => {
            setOverlay(null)
            setTheory(true)
          }}
          leaderboard={{
            board: `${level.id}/${k}`,
            spec: { higherIsBetter: false },
            score: longest,
            format: t.result.score,
          }}
          onAgain={onNew}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  )
}

/** "Rasenmähen": mow a lawn with one or two cutters on short closed rounds (CG:SHOP 2027). */
export default function LawnMowingGame() {
  const t = useLocalized({ de, en })
  const prefs = usePrefs()
  const phone = useMedia('(pointer: coarse)')
  const [game, setGame] = useState<{ n: number; setup: Setup } | null>(null)
  const [overlay, setOverlay] = useState<'howto' | 'setup' | null>(prefs.seenHowTo ? 'setup' : 'howto')
  const initial: Setup = { lawn: prefs.lawn, cutters: phone ? 1 : prefs.cutters }
  const level = useLevel<LawnMowingLevel>(game?.setup.lawn ?? initial.lawn)

  const start = (setup: Setup) => {
    prefs.setSetup(setup)
    setGame({ n: (game?.n ?? 0) + 1, setup })
    setOverlay(null)
  }

  return (
    <>
      {game && level.status === 'ready' ? (
        <Round key={game.n} level={level.value} setup={game.setup} t={t} onNew={() => setOverlay('setup')} />
      ) : (
        <div className={styles.game}>
          <GameHeader title={t.title} />
          <div className={styles.loading}>{level.status === 'error' ? level.error : ''}</div>
        </div>
      )}
      {overlay === 'howto' && (
        <HowToOverlay
          animation={<HowToAnimation label={t.howToAnimation} />}
          keys={howToKeys(t, 2, phone)}
          onClose={() => {
            prefs.setSeenHowTo()
            setOverlay('setup')
          }}
        >
          {t.howTo(initial.cutters).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </HowToOverlay>
      )}
      {overlay === 'setup' && (
        <SetupOverlay
          initial={game?.setup ?? initial}
          phone={phone}
          t={t}
          onStart={start}
          onClose={game ? () => setOverlay(null) : undefined}
        />
      )}
    </>
  )
}
