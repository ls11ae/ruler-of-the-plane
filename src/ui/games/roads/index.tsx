import { useMemo, useRef, useState } from 'react'
import {
  LEVEL_IDS,
  mapOf,
  randomMap,
  randomSize,
  type RoadsLevelId,
  type RoadsMap,
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
import { leaderboardScore, percentOver, starsFor } from '../../../core/games/roads/rules'
import type { KingsTaxesLevel } from '../../../core/levels/schema'
import { Board } from '../../components/Board'
import { Button } from '../../components/Button'
import { GameHeader } from '../../components/GameHeader'
import { HowToOverlay } from '../../components/HowToOverlay'
import { ResultScreen } from '../../components/ResultScreen'
import { useLocalized, useT } from '../../i18n'
import { useLevel } from '../../levels'
import { HowToAnimation } from './HowToAnimation'
import { de, type RoadsTexts } from './i18n.de'
import { en } from './i18n.en'
import { KruskalAnimation, TheoryPanel } from './Kruskal'
import { LevelPicker } from './LevelPicker'
import { RoadsLayer, type Highlight } from './RoadsBoard'
import { Scenery } from './Scenery'
import styles from './Roads.module.css'
import { useProgress } from './store'
import { useMedia } from './useMedia'

/** Pause between the optimal network and the result screen, to see it. */
const RESULT_DELAY_MS = 700

interface MapScreenProps {
  map: RoadsMap
  /** The Unity level, or null for random villages. */
  levelId: RoadsLevelId | null
  subtitle: string
  t: RoadsTexts
  onNext: () => void
  onPicker: () => void
}

function MapScreen({ map, levelId, subtitle, t, onNext, onPicker }: MapScreenProps) {
  const shell = useT()
  const progress = useProgress()
  const { points } = map
  const mst = useMemo(() => kruskal(points), [points])
  const [roads, setRoads] = useState<Road[]>([])
  const [hints, setHints] = useState(0)
  const [highlight, setHighlight] = useState<{ mark: Highlight; text: string } | null>(null)
  const [overlay, setOverlay] = useState<'howto' | 'result' | null>(progress.seenHowTo ? null : 'howto')
  const [theory, setTheory] = useState(false)
  const [step, setStep] = useState(0)
  const [won, setWon] = useState<{ seconds: number; hints: number } | null>(null)
  const startedAt = useRef<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const touch = useMedia('(pointer: coarse)')
  const narrow = useMedia('(max-width: 720px)')

  const length = networkLength(points, roads)
  const groups = componentCount(points.length, roads)
  const optimal = isOptimal(points, roads, mst.length)

  const change = (next: Road[]) => {
    setRoads(next)
    setHighlight(null)
    if (startedAt.current === null) startedAt.current = performance.now()
    if (!won && isOptimal(points, next, mst.length)) {
      const result = { seconds: (performance.now() - startedAt.current) / 1000, hints }
      setWon(result)
      if (levelId) progress.recordWin(levelId, starsFor(hints))
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setOverlay('result'), RESULT_DELAY_MS)
    }
  }

  const restart = () => {
    window.clearTimeout(timer.current)
    setRoads([])
    setHints(0)
    setHighlight(null)
    setWon(null)
    setOverlay(null)
    startedAt.current = null
  }

  const askHint = () => {
    const h = hint(points, roads, mst.length)
    if (!h) return
    setHints((n) => n + 1)
    setHighlight({ mark: { road: h.road, tone: h.kind === 'build' ? 'good' : 'bad' }, text: t.hints[h.kind] })
  }

  const state = optimal
    ? t.optimal
    : groups > 1
      ? roads.length === 0
        ? t.start
        : t.groups(groups)
      : t.over(percentOver(overOptimum(length, mst.length)))

  return (
    <div className={styles.game}>
      <GameHeader
        title={t.title}
        subtitle={subtitle}
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
            <Button small={narrow} onClick={() => setOverlay('howto')}>
              {shell.game.howTo}
            </Button>
            <Button small={narrow} onClick={askHint} disabled={optimal}>
              {t.hintButton}
            </Button>
            <Button small={narrow} selected={theory} aria-pressed={theory} onClick={() => setTheory(!theory)}>
              {t.theoryButton}
            </Button>
            <Button small={narrow} onClick={restart}>
              {t.restart}
            </Button>
            <Button small={narrow} onClick={onPicker}>
              {t.maps}
            </Button>
          </>
        }
      />
      <main className={styles.main}>
        <div className={styles.boardArea}>
          <Board bounds={map.bounds} padding={0.7} autoRotate label={t.board(points.length)}>
            <Scenery map={map} />
            <RoadsLayer
              map={map}
              roads={roads}
              highlight={highlight?.mark ?? null}
              overlay={theory ? kruskalSoFar(mst.steps, step) : undefined}
              onBuild={(road) => {
                if (!roads.some((r) => roadKey(r) === roadKey(road))) change([...roads, road])
              }}
              onRemove={(road) => change(roads.filter((r) => roadKey(r) !== roadKey(road)))}
            />
          </Board>
        </div>
        {theory && (
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
        )}
      </main>
      {/* The footer explains the controls, or shows the hint (where it covers no place on the map). */}
      <footer className={styles.footer} data-hint={highlight ? true : undefined}>
        {highlight ? (
          <span role="status" data-testid="roads-hint">
            {highlight.text}
          </span>
        ) : touch ? (
          t.hintTouch
        ) : (
          t.hintMouse
        )}
      </footer>
      {overlay === 'howto' && (
        <HowToOverlay
          animation={<HowToAnimation label={t.howToAnimation} done={t.optimal} />}
          onClose={() => {
            progress.setSeenHowTo()
            setOverlay(null)
          }}
        >
          {t.howTo.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </HowToOverlay>
      )}
      {overlay === 'result' && won && (
        <ResultScreen
          outcome="won"
          stars={starsFor(won.hints)}
          stats={t.stats(mst.length, won.hints, t.time(won.seconds))}
          explanation={t.explanation(points.length).join(' ')}
          animation={<KruskalAnimation map={map} label={t.kruskalAnimation} replay={t.replay} />}
          onTheory={() => {
            setOverlay(null)
            setTheory(true)
          }}
          leaderboard={
            levelId
              ? {
                  board: `roads/${levelId.replace('kings-taxes/', '')}`,
                  spec: { higherIsBetter: false },
                  score: leaderboardScore(won.seconds, won.hints),
                  format: (score) => t.time(score),
                }
              : undefined
          }
          onAgain={restart}
          onNext={onNext}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  )
}

function FixedMap({ index, t, onPicker }: { index: number; t: RoadsTexts; onPicker: () => void }) {
  const id = LEVEL_IDS[index]!
  const level = useLevel<KingsTaxesLevel>(id)
  const setLevel = useProgress((s) => s.setLevel)
  const map = useMemo(() => (level.status === 'ready' ? mapOf(level.value) : null), [level])
  if (!map) {
    return (
      <div className={styles.game}>
        <GameHeader title={t.title} />
        <div className={styles.loading}>{level.status === 'error' ? level.error : '…'}</div>
      </div>
    )
  }
  return (
    <MapScreen
      key={id}
      map={map}
      levelId={id}
      subtitle={t.subtitle(index + 1, LEVEL_IDS.length, map.points.length)}
      t={t}
      onNext={() => setLevel(index + 1)}
      onPicker={onPicker}
    />
  )
}

function RandomMap({ t, onPicker }: { t: RoadsTexts; onPicker: () => void }) {
  const round = useProgress((s) => s.round)
  const nextRound = useProgress((s) => s.nextRound)
  // A new seed per map; shown in the subtitle, so a map can be reproduced from it.
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 9999))
  const map = useMemo(() => randomMap(seed, randomSize(round)), [seed, round])
  return (
    <MapScreen
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

/** "Straßenbau": connect all places with the shortest road network (minimum spanning tree). */
export default function RoadsGame() {
  const t = useLocalized({ de, en })
  const level = useProgress((s) => s.level)
  const setLevel = useProgress((s) => s.setLevel)
  const [picker, setPicker] = useState(false)
  const openPicker = () => setPicker(true)
  return (
    <>
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
    </>
  )
}
