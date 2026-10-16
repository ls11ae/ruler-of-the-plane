import { useMemo, useRef, useState } from 'react'
import { thickestDarkSpot } from '../../../core/games/art-gallery/coverage'
import { cornerCount, guaranteedTorches } from '../../../core/games/art-gallery/dungeon'
import {
  ALL_LEVELS,
  EXPERT_LEVELS,
  isRecord,
  leaderboardScore,
  levelId,
  MAIN_LEVELS,
  MAX_TORCHES,
  splitScore,
  starsFor,
  type LevelName,
} from '../../../core/games/art-gallery/rules'
import type { Vec2 } from '../../../core/geometry/types'
import type { ArtGalleryLevel } from '../../../core/levels/schema'
import { Board } from '../../components/Board'
import { Button } from '../../components/Button'
import { GameHeader } from '../../components/GameHeader'
import { HowToOverlay } from '../../components/HowToOverlay'
import { ProgressBar } from '../../components/ProgressBar'
import { ResultScreen } from '../../components/ResultScreen'
import { useLocalized, useT } from '../../i18n'
import { useLevel } from '../../levels'
import styles from './ArtGallery.module.css'
import { DarkHint, DungeonFloor, DungeonWalls, LightLayer } from './DungeonArt'
import { FiskAnimation, SweepAnimation } from './Explanation'
import { HowToAnimation } from './HowToAnimation'
import { de, type ArtGalleryTexts } from './i18n.de'
import { en } from './i18n.en'
import { LevelPicker } from './LevelPicker'
import { makeLighting } from './lighting'
import { useProgress } from './store'
import { TheoryLayer, TheoryPanel, type TheoryLayers } from './Theory'
import { TorchControls, type DragState, type PlacedTorch } from './TorchControls'
import { TrashIcon } from './TrashIcon'
import { useMedia } from './useMedia'

/** Delay between the last torch lighting everything and the result screen, to see the lit dungeon. */
const RESULT_DELAY_MS = 900

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')} min`

function positionInSet(name: LevelName) {
  const expert = (EXPERT_LEVELS as readonly string[]).includes(name)
  const set: readonly LevelName[] = expert ? EXPERT_LEVELS : MAIN_LEVELS
  return { expert, index: set.indexOf(name), count: set.length }
}

function TorchDots({ count, k, t }: { count: number; k: number; t: ArtGalleryTexts }) {
  const slots = Math.max(count, k)
  return (
    <span className={styles.torchCount}>
      <span>{t.torches(count, k)}</span>
      <span className={styles.dots} aria-hidden="true">
        {Array.from({ length: Math.min(slots, 20) }, (_, i) => (
          <span
            key={i}
            className={[styles.dot, i >= count && styles.empty, i >= k && i < count && styles.extra]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </span>
    </span>
  )
}

interface Result {
  /** Where the torches stood when everything was lit (for the explanation). */
  positions: Vec2[]
  torches: number
  seconds: number
  stars: number
  record: boolean
}

function LevelScreen({ level, name, t }: { level: ArtGalleryLevel; name: LevelName; t: ArtGalleryTexts }) {
  const shell = useT()
  const progress = useProgress()
  const lighting = useMemo(() => makeLighting(level), [level])
  const [torches, setTorches] = useState<PlacedTorch[]>([])
  const [nextId, setNextId] = useState(1)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [overlay, setOverlay] = useState<'howto' | 'result' | 'picker' | null>(
    progress.seenHowTo ? null : 'howto',
  )
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [lit, setLit] = useState(false)
  const [theory, setTheory] = useState(false)
  // Not everything at once: Fisk's colouring where it works (no pillars), else the visibility regions.
  const [layers, setLayers] = useState<TheoryLayers>({
    triangles: true,
    visibility: level.holes.length > 0,
    colouring: level.holes.length === 0,
  })
  const trash = useRef<HTMLDivElement>(null)
  const resultTimer = useRef<number | undefined>(undefined)
  const touch = useMedia('(pointer: coarse)')
  const narrow = useMedia('(max-width: 720px)')
  const k = level.torches
  const { expert, index, count } = positionInSet(name)

  // While dragging, the dragged torch lights from where it is now (or not at all, off the floor).
  const shown = useMemo(
    () => torches.flatMap((tt) => (tt.id === drag?.id ? (drag.valid ? [drag.at] : []) : [tt.at])),
    [torches, drag],
  )
  const light = useMemo(() => lighting.light(shown), [lighting, shown])
  // The hint at the thickest dark spot: only between moves (a dozen offsets, too slow for every frame).
  const hint = useMemo(
    () =>
      drag || light.coverage.fullyLit || torches.length === 0
        ? null
        : thickestDarkSpot(light.coverage.darkPaths),
    [drag, light, torches.length],
  )
  const active = drag?.id ?? hovered
  const activeTorch = torches.find((tt) => tt.id === active)
  const outline =
    drag && drag.valid
      ? lighting.visibility(drag.at)
      : !drag && activeTorch
        ? lighting.visibility(activeTorch.at)
        : undefined

  const commit = (next: PlacedTorch[]) => {
    setTorches(next)
    const nowLit = next.length > 0 && lighting.light(next.map((tt) => tt.at)).coverage.fullyLit
    if (nowLit && !lit) {
      const seconds = startedAt === null ? 0 : (performance.now() - startedAt) / 1000
      const stars = starsFor(next.length, k)
      setResult({
        positions: next.map((tt) => tt.at),
        torches: next.length,
        seconds,
        stars,
        record: isRecord(next.length, k),
      })
      progress.recordWin(name, next.length, stars)
      window.clearTimeout(resultTimer.current)
      resultTimer.current = window.setTimeout(() => setOverlay('result'), RESULT_DELAY_MS)
    }
    setLit(nowLit)
  }

  const restart = () => {
    window.clearTimeout(resultTimer.current)
    setTorches([])
    setLit(false)
    setStartedAt(null)
    setResult(null)
    setOverlay(null)
  }

  const next = ALL_LEVELS[ALL_LEVELS.indexOf(name) + 1]
  const percent = light.coverage.fullyLit ? 100 : Math.min(99, Math.floor(light.coverage.litShare * 100))
  const n = cornerCount(level)
  const bound = guaranteedTorches(level)

  return (
    <div className={styles.game}>
      <GameHeader
        title={t.title}
        subtitle={t.subtitle(index + 1, count, k, expert)}
        status={
          <span className={styles.status}>
            <TorchDots count={torches.length} k={k} t={t} />
            <span className={styles.lit}>
              <span className={styles.percent} data-testid="lit-percent">
                {percent} %<small>{t.lit}</small>
              </span>
              <ProgressBar value={percent / 100} label={t.litLabel} width={narrow ? 120 : 200} />
            </span>
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
            <Button small={narrow} onClick={() => setOverlay('picker')}>
              {t.levels}
            </Button>
          </>
        }
      />
      <main className={styles.main}>
        <div className={styles.boardArea}>
          <Board bounds={level.bounds} padding={0.35} autoRotate label={t.board(k)}>
            <DungeonFloor level={level} />
            <LightLayer
              torches={shown}
              visibility={light.visibility}
              dark={light.coverage.fullyLit ? [] : light.coverage.dark}
              outline={outline}
            />
            <DungeonWalls level={level} />
            {theory && <TheoryLayer level={level} layers={layers} visibility={light.visibility} />}
            {hint && <DarkHint at={hint.at} />}
            <TorchControls
              level={level}
              torches={torches}
              drag={drag}
              hovered={hovered}
              radiusPx={touch ? 22 : 18}
              canAdd={torches.length < MAX_TORCHES}
              isOverTrash={(x, y) => {
                const r = trash.current?.getBoundingClientRect()
                return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
              }}
              onAdd={(at: Vec2) => {
                if (startedAt === null) setStartedAt(performance.now())
                setNextId(nextId + 1)
                commit([...torches, { id: nextId, at }])
              }}
              onDrag={setDrag}
              onDrop={(d) => {
                setDrag(null)
                commit(
                  d.valid
                    ? torches.map((tt) => (tt.id === d.id ? { ...tt, at: d.at } : tt))
                    : torches.filter((tt) => tt.id !== d.id),
                )
              }}
              onHover={setHovered}
            />
          </Board>
          {drag && (
            <div
              ref={trash}
              className={[styles.trash, drag.overTrash && styles.over].filter(Boolean).join(' ')}
            >
              <TrashIcon />
              {t.trash}
            </div>
          )}
        </div>
        {theory && (
          <TheoryPanel
            level={level}
            torches={torches.length}
            layers={layers}
            setLayers={setLayers}
            t={t}
            onClose={() => setTheory(false)}
          />
        )}
      </main>
      <footer className={styles.footer}>{touch ? t.hintTouch : t.hintMouse}</footer>
      {overlay === 'howto' && (
        <HowToOverlay
          animation={<HowToAnimation doneLabel={t.howToAnimation} />}
          onClose={() => {
            progress.setSeenHowTo()
            setOverlay(null)
          }}
        >
          {t.howTo(k).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </HowToOverlay>
      )}
      {overlay === 'picker' && (
        <LevelPicker
          t={t}
          onClose={() => setOverlay(null)}
          onPick={(picked) => {
            setOverlay(null)
            progress.setLevel(picked)
          }}
        />
      )}
      {overlay === 'result' && result && (
        <ResultScreen
          outcome="won"
          stars={result.stars}
          record={result.record}
          stats={t.stats(result.torches, formatTime(result.seconds))}
          explanation={(level.holes.length === 0 ? t.fisk(n, bound, k) : t.sweep(bound)).join(' ')}
          animation={
            level.holes.length === 0 ? (
              <FiskAnimation level={level} label={t.fiskAnimation} replay={t.replay} />
            ) : (
              <SweepAnimation
                level={level}
                torches={result.positions}
                label={t.sweepAnimation}
                replay={t.replay}
              />
            )
          }
          onTheory={() => {
            setOverlay(null)
            setTheory(true)
          }}
          leaderboard={{
            board: levelId(name),
            spec: { higherIsBetter: false },
            score: leaderboardScore(result.torches, result.seconds),
            format: (score) => {
              const s = splitScore(score)
              return t.score(s.torches, formatTime(s.seconds))
            },
          }}
          onAgain={restart}
          onNext={next ? () => progress.setLevel(next) : undefined}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  )
}

/** "Licht ins Verlies": light a dungeon with as few torches as possible (art gallery problem). */
export default function ArtGalleryGame() {
  const t = useLocalized({ de, en })
  const name = useProgress((s) => s.level)
  const level = useLevel<ArtGalleryLevel>(levelId(name))
  if (level.status !== 'ready') {
    return (
      <div className={styles.game}>
        <GameHeader title={t.title} />
        <div className={styles.loading}>{level.status === 'error' ? level.error : '…'}</div>
      </div>
    )
  }
  return <LevelScreen key={name} level={level.value} name={name} t={t} />
}
