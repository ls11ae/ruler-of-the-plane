import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  addRoad,
  EMPTY_NETWORK,
  extendTo,
  fullTopologyCount,
  isNearlyOptimal,
  junctionHint,
  lengthOf,
  mergeInto,
  moveJunction,
  placeGroups,
  relax,
  removeRoad,
  splitRoad,
  type JunctionHint,
  type JunctionNetwork,
} from '../../../core/games/roads/junctions'
import {
  LEVEL_IDS,
  mapOf,
  randomMap,
  randomSize,
  setOf,
  tierOfIndex,
  type RoadsLevelId,
  type RoadsMap,
  type RoadsSet,
} from '../../../core/games/roads/levels'
import {
  componentCount,
  hint,
  isOptimal,
  kruskal,
  kruskalSoFar,
  networkLength,
  overOptimum,
  roadKey,
  type Road,
} from '../../../core/games/roads/mst'
import {
  crossings,
  freeTree,
  isPlaneOptimal,
  joinsTwoKinds,
  planeHint,
} from '../../../core/games/roads/plane'
import { leaderboardScore, percentOver, starsFor } from '../../../core/games/roads/rules'
import type { Vec2 } from '../../../core/geometry/types'
import type {
  KingsTaxesLevel,
  Level,
  RoadsBichromaticLevel,
  RoadsSteinerLevel,
} from '../../../core/levels/schema'
import { Board } from '../../components/Board'
import { Button } from '../../components/Button'
import { GameHeader } from '../../components/GameHeader'
import { HowToOverlay } from '../../components/HowToOverlay'
import { NextLabel } from '../../components/nextLabel'
import { ResultScreen } from '../../components/ResultScreen'
import { useLocalized, useT } from '../../i18n'
import { useAnimationFrame } from '../../input/hooks'
import { useLevel } from '../../levels'
import { useTierMemory } from '../../shell/tiers'
import { HowToAnimation } from './HowToAnimation'
import { de, type RoadsTexts } from './i18n.de'
import { en } from './i18n.en'
import { KruskalAnimation, TheoryPanel } from './Kruskal'
import { LevelPicker } from './LevelPicker'
import { PlaneAnimation, PlaneHowTo, PlaneTheory } from './Plane'
import { RoadsLayer, type Highlight, type JunctionEditing, type Segment } from './RoadsBoard'
import { Scenery } from './Scenery'
import { SteinerAnimation, SteinerHowTo, SteinerTheory } from './Steiner'
import styles from './Roads.module.css'
import { useProgress } from './store'
import { RoadsTiers } from './Tiers'
import { useMedia } from './useMedia'

/** Pause between the optimal network and the result screen, to see it. */
const RESULT_DELAY_MS = 900
/** "Kreuzungen": how the junctions settle on a win (Weiszfeld rounds; the first ones are shown). */
const SETTLE_ROUNDS = 2000
const SETTLE_FRAMES = 30
const SETTLE_FRAME_MS = 16

/** A message in the footer: a hint (with what it marks on the map) or why a road was refused. */
type Notice = { mark: Highlight; text: string } | null

/** A round on one map, the same in every set: time, hints, the win, "So geht's" and the result. */
function useRound(levelId: RoadsLevelId | null, set: RoadsSet) {
  const progress = useProgress()
  const [hints, setHints] = useState(0)
  const [won, setWon] = useState<{ seconds: number; hints: number; length: number } | null>(null)
  const [overlay, setOverlay] = useState<'howto' | 'result' | null>(progress.seenHowTo[set] ? null : 'howto')
  const startedAt = useRef<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return {
    hints,
    won,
    overlay,
    setOverlay,
    hint: () => setHints((n) => n + 1),
    /** After every change of the network: starts the clock, and wins if the network is optimal. */
    check(optimal: boolean, length: number) {
      if (startedAt.current === null) startedAt.current = performance.now()
      if (won || !optimal) return
      setWon({ seconds: (performance.now() - startedAt.current) / 1000, hints, length })
      if (levelId) progress.recordWin(levelId, starsFor(hints))
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setOverlay('result'), RESULT_DELAY_MS)
    },
    restart() {
      window.clearTimeout(timer.current)
      setHints(0)
      setWon(null)
      setOverlay(null)
      startedAt.current = null
    },
    closeHowTo() {
      progress.setSeenHowTo(set)
      setOverlay(null)
    },
  }
}
type Round = ReturnType<typeof useRound>

interface FrameProps {
  t: RoadsTexts
  map: RoadsMap
  levelId: RoadsLevelId | null
  subtitle: string
  round: Round
  length: number
  state: string
  optimal: boolean
  notice: Notice
  theory: boolean
  setTheory(on: boolean): void
  onHint(): void
  onRestart(): void
  onPicker(): void
  onNext(): void
  /** The map's content on the board (scenery comes first). */
  board: ReactNode
  /** The theory beside the board, while open. */
  panel: ReactNode
  controls: { mouse: string; touch: string }
  howTo: { lines: string[]; animation: ReactNode }
  result: { explanation: string[]; animation: ReactNode }
}

/** What every set shows around its board: header with length and state, footer, overlays. */
function Frame(props: FrameProps) {
  const { t, map, levelId, round, length, state, optimal, notice, theory, setTheory } = props
  const shell = useT()
  const touch = useMedia('(pointer: coarse)')
  const narrow = useMedia('(max-width: 720px)')
  const { won } = round
  return (
    <div className={styles.game}>
      <GameHeader
        title={t.title}
        subtitle={props.subtitle}
        status={
          <span className={styles.status}>
            <span className={styles.length} data-testid="roads-length">
              {t.length(length)}
            </span>
            <span className={styles.state} data-optimal={optimal || undefined} data-testid="roads-state">
              {state}
            </span>
          </span>
        }
        actions={
          <>
            <Button small={narrow} onClick={() => round.setOverlay('howto')}>
              {shell.game.howTo}
            </Button>
            <Button small={narrow} onClick={props.onHint} disabled={optimal}>
              {t.hintButton}
            </Button>
            <Button small={narrow} selected={theory} aria-pressed={theory} onClick={() => setTheory(!theory)}>
              {t.theoryButton}
            </Button>
            <Button small={narrow} onClick={props.onRestart}>
              {t.restart}
            </Button>
            <Button small={narrow} onClick={props.onPicker}>
              {t.maps}
            </Button>
          </>
        }
      />
      <main className={styles.main}>
        <div className={styles.boardArea}>
          <Board bounds={map.bounds} padding={0.7} autoRotate label={t.board(map.points.length)}>
            <Scenery map={map} />
            {props.board}
          </Board>
        </div>
        {theory && props.panel}
      </main>
      {/* The footer explains the controls, or shows the hint (where it covers no place on the map). */}
      <footer className={styles.footer} data-hint={notice ? true : undefined}>
        {notice ? (
          <span role="status" data-testid="roads-hint">
            {notice.text}
          </span>
        ) : touch ? (
          props.controls.touch
        ) : (
          props.controls.mouse
        )}
      </footer>
      {round.overlay === 'howto' && (
        <HowToOverlay animation={props.howTo.animation} onClose={round.closeHowTo}>
          {props.howTo.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </HowToOverlay>
      )}
      {round.overlay === 'result' && won && (
        <ResultScreen
          outcome="won"
          stars={starsFor(won.hints)}
          stats={t.stats(won.length, won.hints, t.time(won.seconds))}
          explanation={props.result.explanation.join(' ')}
          animation={props.result.animation}
          onTheory={() => {
            round.setOverlay(null)
            setTheory(true)
          }}
          leaderboard={
            levelId
              ? {
                  board: levelId.startsWith('roads/')
                    ? levelId
                    : `roads/${levelId.replace('kings-taxes/', '')}`,
                  spec: { higherIsBetter: false },
                  score: leaderboardScore(won.seconds, won.hints),
                  format: (score) => t.time(score),
                }
              : undefined
          }
          onAgain={props.onRestart}
          onNext={props.onNext}
          onClose={() => round.setOverlay(null)}
        />
      )}
    </div>
  )
}

interface ScreenProps {
  map: RoadsMap
  /** The fixed map, or null for random villages. */
  levelId: RoadsLevelId | null
  subtitle: string
  t: RoadsTexts
  onNext: () => void
  onPicker: () => void
}

/** "Von Ort zu Ort": roads only between places (minimum spanning tree). */
function MstScreen({ map, levelId, subtitle, t, onNext, onPicker }: ScreenProps) {
  const { points } = map
  const mst = useMemo(() => kruskal(points), [points])
  const round = useRound(levelId, 'mst')
  const [roads, setRoads] = useState<Road[]>([])
  const [notice, setNotice] = useState<Notice>(null)
  const [theory, setTheory] = useState(false)
  const [step, setStep] = useState(0)

  const length = networkLength(points, roads)
  const groups = componentCount(points.length, roads)
  const optimal = isOptimal(points, roads, mst.length)
  const change = (next: Road[]) => {
    setRoads(next)
    setNotice(null)
    round.check(isOptimal(points, next, mst.length), networkLength(points, next))
  }
  const state = optimal
    ? t.optimal
    : groups > 1
      ? roads.length === 0
        ? t.start
        : t.groups(groups)
      : t.over(percentOver(overOptimum(length, mst.length)))
  const overlay: Segment[] | undefined = theory
    ? kruskalSoFar(mst.steps, step).map(({ road, taken, current }) => ({
        key: roadKey(road),
        a: points[road[0]]!,
        b: points[road[1]]!,
        tone: current ? (taken ? 'good' : 'bad') : taken ? 'good' : undefined,
        ghost: !current,
      }))
    : undefined

  return (
    <Frame
      t={t}
      map={map}
      levelId={levelId}
      subtitle={subtitle}
      round={round}
      length={length}
      state={state}
      optimal={optimal}
      notice={notice}
      theory={theory}
      setTheory={(on) => {
        setTheory(on)
        if (!on) setStep(0)
      }}
      onHint={() => {
        const h = hint(points, roads, mst.length)
        if (!h) return
        round.hint()
        setNotice({
          mark: { road: h.road, tone: h.kind === 'build' ? 'good' : 'bad' },
          text: t.hints[h.kind],
        })
      }}
      onRestart={() => {
        setRoads([])
        setNotice(null)
        round.restart()
      }}
      onPicker={onPicker}
      onNext={onNext}
      board={
        <RoadsLayer
          map={map}
          roads={roads}
          highlight={notice?.mark ?? null}
          overlay={overlay}
          onBuild={(road) => {
            if (!roads.some((r) => roadKey(r) === roadKey(road))) change([...roads, road])
          }}
          onRemove={(road) => change(roads.filter((r) => roadKey(r) !== roadKey(road)))}
        />
      }
      panel={
        <TheoryPanel
          map={map}
          step={step}
          setStep={setStep}
          t={t}
          onClose={() => {
            setTheory(false)
            setStep(0)
          }}
        />
      }
      controls={{ mouse: t.hintMouse, touch: t.hintTouch }}
      howTo={{ lines: t.howTo, animation: <HowToAnimation label={t.howToAnimation} done={t.optimal} /> }}
      result={{
        explanation: t.explanation(points.length),
        animation: <KruskalAnimation map={map} label={t.kruskalAnimation} replay={t.replay} />,
      }}
    />
  )
}

function junctionNotice(h: NonNullable<JunctionHint>, t: RoadsTexts): Notice {
  const text = t.steiner.hints[h.kind]
  switch (h.kind) {
    case 'deadEnd':
    case 'notOptimal':
      return { mark: { road: h.road, tone: 'bad' }, text }
    case 'build':
      return { mark: { road: h.road, tone: 'good' }, text }
    case 'bend':
    case 'extra':
      return { mark: { node: h.junction, tone: 'bad' }, text }
    case 'angle':
      return { mark: { node: h.junction, tone: 'good' }, text }
    case 'missing':
      return { mark: { at: h.at, from: h.from, tone: 'good' }, text }
  }
}

/** "Kreuzungen": roads may branch at junctions (Steiner tree); within 1 % of the optimum counts. */
function SteinerScreen({
  level,
  ...props
}: Omit<ScreenProps, 'map' | 'levelId'> & { level: RoadsSteinerLevel }) {
  const { t } = props
  const map = useMemo(() => mapOf(level), [level])
  const { points } = map
  const places = points.length
  const { optimum } = level
  const round = useRound(level.id as RoadsLevelId, 'steiner')
  const [net, setNet] = useState<JunctionNetwork>(EMPTY_NETWORK)
  // The latest network: a drag's handlers run several times before React renders again.
  const current = useRef(net)
  const [notice, setNotice] = useState<Notice>(null)
  const [theory, setTheory] = useState(false)
  const [show, setShow] = useState<'mst' | 'optimum' | null>(null)
  const mst = useMemo(() => kruskal(points), [points])

  // On the win the junctions slide the last bit to their best spots, so the angles read 120°.
  const [settle, setSettle] = useState<{ frames: Vec2[][]; start: number } | null>(null)
  useAnimationFrame((now) => {
    if (!settle) return
    // (A frame's time can lie a little before the event that started the slide.)
    const k = Math.min(
      settle.frames.length - 1,
      Math.max(0, Math.floor((now - settle.start) / SETTLE_FRAME_MS)),
    )
    current.current = { ...current.current, junctions: settle.frames[k]! }
    setNet(current.current)
    if (k === settle.frames.length - 1) setSettle(null)
  }, settle !== null)

  /** A new network; `settled` once the pointer is let go (a junction in motion never wins). */
  const change = (next: JunctionNetwork, settled = true) => {
    current.current = next
    setNet(next)
    setNotice(null)
    setSettle(null)
    if (!settled) return
    const optimal = isNearlyOptimal(points, next, optimum.length)
    if (optimal && !round.won && next.junctions.length) {
      const frames = relax(points, next, SETTLE_ROUNDS)
      setSettle({ frames: [...frames.slice(0, SETTLE_FRAMES), frames.at(-1)!], start: performance.now() })
    }
    round.check(optimal, lengthOf(points, next))
  }
  const edit: JunctionEditing = {
    junctions: net.junctions,
    onExtend: (from, at) => change(extendTo(places, current.current, from, at)),
    onSplit: (road, at) => {
      const { net: next, junction } = splitRoad(places, current.current, road, at)
      change(next, false)
      return junction
    },
    onMove: (node, at) => change(moveJunction(places, current.current, node, at), false),
    onMoveEnd: (node, onto) =>
      change(onto === null ? current.current : mergeInto(places, current.current, node, onto)),
  }

  const length = lengthOf(points, net)
  const groups = placeGroups(places, net)
  const optimal = isNearlyOptimal(points, net, optimum.length)
  const state = optimal
    ? t.optimal
    : groups > 1
      ? net.roads.length === 0
        ? t.start
        : t.groups(groups)
      : t.over(percentOver(overOptimum(length, optimum.length)))
  const optimumNodes = [...points, ...optimum.junctions]
  const overlay: Segment[] | undefined =
    theory && show === 'mst'
      ? mst.roads.map((r) => ({
          key: roadKey(r),
          a: points[r[0]]!,
          b: points[r[1]]!,
          tone: 'bad',
          ghost: true,
        }))
      : theory && show === 'optimum'
        ? optimum.roads.map((r) => ({
            key: roadKey(r),
            a: optimumNodes[r[0]]!,
            b: optimumNodes[r[1]]!,
            tone: 'good',
            ghost: true,
          }))
        : undefined

  return (
    <Frame
      {...props}
      map={map}
      levelId={level.id as RoadsLevelId}
      round={round}
      length={length}
      state={state}
      optimal={optimal}
      notice={notice}
      theory={theory}
      setTheory={setTheory}
      onHint={() => {
        const h = junctionHint(points, net, optimum)
        if (!h) return
        round.hint()
        setNotice(junctionNotice(h, t))
      }}
      onRestart={() => {
        change(EMPTY_NETWORK, false)
        round.restart()
      }}
      board={
        <RoadsLayer
          map={map}
          roads={net.roads}
          highlight={notice?.mark ?? null}
          overlay={overlay}
          edit={edit}
          onBuild={(road) => change(addRoad(current.current, road))}
          onRemove={(road) => change(removeRoad(places, current.current, road))}
        />
      }
      panel={
        <SteinerTheory
          mstLength={level.mstLength}
          optimum={optimum}
          show={show}
          setShow={setShow}
          t={t}
          onClose={() => setTheory(false)}
        />
      }
      controls={{ mouse: t.steiner.hintMouse, touch: t.steiner.hintTouch }}
      howTo={{ lines: t.steiner.howTo, animation: <SteinerHowTo label={t.steiner.howToAnimation} /> }}
      result={{
        explanation: t.steiner.explanation(places, fullTopologyCount(places)),
        animation: <SteinerAnimation map={map} optimum={optimum} t={t} />,
      }}
    />
  )
}

/** "Zwei Sorten": every road joins a castle and a village, and no two roads cross. */
function PlaneScreen({
  level,
  ...props
}: Omit<ScreenProps, 'map' | 'levelId'> & { level: RoadsBichromaticLevel }) {
  const { t } = props
  const map = useMemo(() => mapOf(level), [level])
  const { points, villages } = map
  const round = useRound(level.id as RoadsLevelId, 'bichromatic')
  const [roads, setRoads] = useState<Road[]>([])
  const [notice, setNotice] = useState<Notice>(null)
  const [theory, setTheory] = useState(false)
  const free = useMemo(() => freeTree(points, villages), [points, villages])

  const change = (next: Road[]) => {
    setRoads(next)
    setNotice(null)
    round.check(isPlaneOptimal(points, villages, next, level.optimum.length), networkLength(points, next))
  }
  const found = crossings(points, roads)
  const warn = new Set(found.flatMap((c) => c.roads.map(roadKey)))
  const length = networkLength(points, roads)
  const groups = componentCount(points.length, roads)
  const optimal = isPlaneOptimal(points, villages, roads, level.optimum.length)
  const state = optimal
    ? t.optimal
    : found.length
      ? t.plane.crossing(found.length)
      : groups > 1
        ? roads.length === 0
          ? t.start
          : t.groups(groups)
        : t.over(percentOver(overOptimum(length, level.optimum.length)))

  return (
    <Frame
      {...props}
      map={map}
      levelId={level.id as RoadsLevelId}
      round={round}
      length={length}
      state={state}
      optimal={optimal}
      notice={notice}
      theory={theory}
      setTheory={setTheory}
      onHint={() => {
        const h = planeHint(points, roads, level.optimum.roads)
        if (!h) return
        round.hint()
        setNotice({
          mark: { road: h.road, tone: h.kind === 'build' ? 'good' : 'bad' },
          text: t.plane.hints[h.kind],
        })
      }}
      onRestart={() => {
        setRoads([])
        setNotice(null)
        round.restart()
      }}
      board={
        <RoadsLayer
          map={map}
          roads={roads}
          highlight={notice?.mark ?? null}
          warn={warn}
          crossings={found.map((c) => c.at)}
          canJoin={(a, b) => joinsTwoKinds([a, b], villages)}
          onRefuse={() => setNotice({ mark: null, text: t.plane.refused })}
          onBuild={(road) => {
            if (!roads.some((r) => roadKey(r) === roadKey(road))) change([...roads, road])
          }}
          onRemove={(road) => change(roads.filter((r) => roadKey(r) !== roadKey(road)))}
        />
      }
      panel={
        <PlaneTheory
          map={map}
          roads={roads}
          free={free}
          greedyLength={level.greedy.length}
          t={t}
          onClose={() => setTheory(false)}
        />
      }
      controls={{ mouse: t.plane.hintMouse, touch: t.plane.hintTouch }}
      howTo={{
        lines: t.plane.howTo,
        animation: <PlaneHowTo label={t.plane.howToAnimation} done={t.optimal} />,
      }}
      result={{
        explanation: t.plane.explanation(level.free.crossings),
        animation: <PlaneAnimation map={map} free={free} optimum={level.optimum.roads} t={t} />,
      }}
    />
  )
}

function FixedMap({ index, t, onPicker }: { index: number; t: RoadsTexts; onPicker: () => void }) {
  const id = LEVEL_IDS[index]!
  const level = useLevel<Level>(id)
  const setLevel = useProgress((s) => s.setLevel)
  if (level.status !== 'ready') {
    return (
      <div className={styles.game}>
        <GameHeader title={t.title} />
        <div className={styles.loading}>{level.status === 'error' ? level.error : '…'}</div>
      </div>
    )
  }
  const { set, index: i, count } = setOf(index)
  const value = level.value
  const places = 'villages' in value ? value.villages.length + value.castles.length : 0
  const props = {
    t,
    subtitle:
      set === 'mst' ? t.subtitle(i + 1, count, places) : t.setSubtitle(t.sets[set], i + 1, count, places),
    onNext: () => setLevel(index + 1),
    onPicker,
  }
  if (value.collection === 'roads/steiner') return <SteinerScreen key={id} level={value} {...props} />
  if (value.collection === 'roads/bichromatic') return <PlaneScreen key={id} level={value} {...props} />
  return <MstScreen key={id} map={mapOf(value as KingsTaxesLevel)} levelId={id} {...props} />
}

function RandomMap({ t, onPicker }: { t: RoadsTexts; onPicker: () => void }) {
  const round = useProgress((s) => s.round)
  const nextRound = useProgress((s) => s.nextRound)
  // A new seed per map; shown in the subtitle, so a map can be reproduced from it.
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 9999))
  const map = useMemo(() => randomMap(seed, randomSize(round)), [seed, round])
  return (
    <MstScreen
      key={`${seed}-${round}`}
      map={map}
      levelId={null}
      subtitle={t.randomSubtitle(map.points.length, seed)}
      t={t}
      onNext={() => {
        nextRound()
        setSeed(1 + Math.floor(Math.random() * 9999))
      }}
      onPicker={onPicker}
    />
  )
}

/** The label of "Nächstes Level" on a set's last map: the next set is the next tier. */
function nextLabel(level: number, t: RoadsTexts, shell: ReturnType<typeof useT>): string | null {
  if (level >= LEVEL_IDS.length) return null
  const { index, count } = setOf(level)
  if (index < count - 1) return null
  return level + 1 < LEVEL_IDS.length
    ? shell.tiers.next(shell.tiers.names[tierOfIndex(level + 1)])
    : shell.tiers.next(t.picker.random)
}

/**
 * "Straßenbau": connect all places with the shortest road network: from place to place (minimum
 * spanning tree), with junctions (Steiner tree), and castles to villages without crossings. Opens on
 * the tier screen; the three sets are the tiers "Leicht", "Mittel", "Schwer".
 */
export default function RoadsGame() {
  const t = useLocalized({ de, en })
  const shell = useT()
  const level = useProgress((s) => s.level)
  const setLevel = useProgress((s) => s.setLevel)
  const setLast = useTierMemory((s) => s.setLast)
  const [entered, setEntered] = useState(false)
  const [picker, setPicker] = useState(false)
  const openPicker = () => setPicker(true)
  // The tier being played is the one the tier screen marks next time.
  useEffect(() => {
    if (entered) setLast('roads', tierOfIndex(level))
  }, [entered, level, setLast])
  if (!entered) return <RoadsTiers t={t} onStart={() => setEntered(true)} />
  return (
    <NextLabel.Provider value={nextLabel(level, t, shell)}>
      {level < LEVEL_IDS.length ? (
        <FixedMap index={level} t={t} onPicker={openPicker} />
      ) : (
        <RandomMap t={t} onPicker={openPicker} />
      )}
      {picker && (
        <LevelPicker
          t={t}
          onClose={() => setPicker(false)}
          onPick={(l) => {
            setPicker(false)
            setLevel(l)
          }}
        />
      )}
    </NextLabel.Provider>
  )
}
