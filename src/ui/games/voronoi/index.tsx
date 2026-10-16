import { Delaunay } from 'd3-delaunay'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AiLevel } from '../../../core/games/voronoi/ai'
import { landAreaIn, LAND_POINTS, type GameMap } from '../../../core/games/voronoi/map'
import { hasRoom, makeRaster } from '../../../core/games/voronoi/raster'
import {
  cells,
  exactScores,
  minDistance,
  nearestCastle,
  placementProblem,
  winner,
  type Castle,
  type Player,
} from '../../../core/games/voronoi/rules'
import type { HeatGrid } from '../../../core/games/voronoi/service'
import type { Vec2 } from '../../../core/geometry/types'
import type { VoronoiLevel } from '../../../core/levels/schema'
import { Button } from '../../components/Button'
import { GameHeader } from '../../components/GameHeader'
import { HowToOverlay } from '../../components/HowToOverlay'
import { ResultScreen } from '../../components/ResultScreen'
import { useLocalized, useT } from '../../i18n'
import { useLevel } from '../../levels'
import { useBooth } from '../../shell/booth'
import { useSettings, type Difficulty } from '../../shell/settings'
import { askAi } from './aiClient'
import { AimControls, Ghost, type Aim, type PreviewInfo } from './Aim'
import { GrowingCircles } from './Explanation'
import { HowToAnimation } from './HowToAnimation'
import { de, type VoronoiTexts } from './i18n.de'
import { en } from './i18n.en'
import { MapBoard } from './MapBoard'
import { usePrepared } from './prepared'
import { useMedia } from './useMedia'
import { ScoreCards } from './ScoreCards'
import { SetupOverlay } from './SetupOverlay'
import { usePrefs, type Setup } from './store'
import { PreviewCell } from './Territories'
import { HeatLayer, TheoryLayer, TheoryPanel, type TheoryLayers } from './Theory'
import styles from './Voronoi.module.css'

/** The computer takes at least this long for a move, so players see whose turn it is. */
const THINK_MS = 650
/** Pause after the last castle before the result, to see the final map. */
const RESULT_DELAY_MS = 1300
/** Spacing of the heat map in map units. */
const HEAT_SPACING = 0.25

/** The staff's difficulty names the computer's strength. */
const aiLevelFor = (d: Difficulty): AiLevel => d

interface Preview {
  at: Vec2
  info: PreviewInfo
  cell: readonly Vec2[] | null
  conflicts: Set<number>
}

function Match({
  level,
  setup,
  aiLevel,
  t,
  onNew,
}: {
  level: VoronoiLevel
  setup: Setup
  aiLevel: AiLevel
  t: VoronoiTexts
  onNew: () => void
}) {
  const shell = useT()
  const prefs = usePrefs()
  const recordVersus = useBooth((s) => s.recordVersus)
  const touch = useMedia('(pointer: coarse)')
  const narrow = useMedia('(max-width: 720px)')
  const prep = usePrepared(level)
  const { map } = prep
  const raster = useMemo(() => makeRaster(map), [map])
  const perPlayer = setup.castles
  const minDist = minDistance(map, perPlayer)
  const vsComputer = setup.opponent === 'computer'
  const names: [string, string] = vsComputer
    ? [t.names.you, t.names.computer]
    : [t.names.blue, t.names.orange]

  const [castles, setCastles] = useState<Castle[]>([])
  const [passes, setPasses] = useState<[number, number]>([0, 0])
  const [aim, setAim] = useState<Aim | null>(null)
  const [overlay, setOverlay] = useState<'howto' | 'result' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [theory, setTheory] = useState(false)
  const [layers, setLayers] = useState<TheoryLayers>({
    voronoi: true,
    delaunay: true,
    circles: false,
    heat: false,
  })
  const [heat, setHeat] = useState<{ turn: number; grid: HeatGrid } | null>(null)
  const [seed] = useState(() => Math.floor(Math.random() * 1e9))
  const noticeTimer = useRef<number | undefined>(undefined)

  const placed: [number, number] = [
    castles.filter((c) => c.owner === 0).length + passes[0],
    castles.filter((c) => c.owner === 1).length + passes[1],
  ]
  const turn = placed[0] + placed[1]
  const over = turn >= 2 * perPlayer
  const mover: Player = turn % 2 === 0 ? 0 : 1
  const computerTurn = vsComputer && mover === 1 && !over
  const humanTurn = !over && !computerTurn
  const exact = useMemo(() => exactScores(map, castles), [map, castles])

  const flash = (text: string) => {
    setNotice(text)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2200)
  }
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  // The computer's move, in the worker.
  useEffect(() => {
    if (!computerTurn) return
    let live = true
    let timer: number | undefined
    const started = performance.now()
    void askAi({
      kind: 'move',
      level,
      move: { castles, player: 1, minDist, opponentMovesLeft: placed[0] < perPlayer, level: aiLevel },
      seed: seed + turn,
    }).then(({ at }) => {
      timer = window.setTimeout(
        () => {
          if (!live) return
          if (at) setCastles((cs) => [...cs, { at, owner: 1 }])
          else {
            setPasses(([a, b]) => [a, b + 1])
            flash(t.passed(names[1]))
          }
        },
        Math.max(0, THINK_MS - (performance.now() - started)),
      )
    })
    return () => {
      live = false
      window.clearTimeout(timer)
    }
    // One request per turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computerTurn, turn])

  // A player without room for another castle passes (after a moment, to read why).
  const noRoom = useMemo(
    () => humanTurn && !hasRoom(map, raster, castles, minDist),
    [humanTurn, map, raster, castles, minDist],
  )
  useEffect(() => {
    if (!noRoom) return
    const timer = window.setTimeout(() => {
      setPasses(([a, b]) => (mover === 0 ? [a + 1, b] : [a, b + 1]))
      flash(t.passed(names[mover]))
    }, 400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noRoom, turn])

  // The end: the result after a short look at the final map.
  useEffect(() => {
    if (!over) return
    const w = winner(exact.scores)
    if (vsComputer && w !== null) recordVersus(w === 0 ? 'human' : 'machine')
    const timer = window.setTimeout(() => setOverlay('result'), RESULT_DELAY_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over])

  // The heat map for the player to move, from the worker.
  const wantHeat = theory && layers.heat
  useEffect(() => {
    if (!wantHeat || heat?.turn === turn) return
    let live = true
    void askAi({ kind: 'heat', level, castles, player: mover, minDist, spacing: HEAT_SPACING }).then(
      ({ grid }) => live && setHeat({ turn, grid }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantHeat, turn])

  const preview = useMemo((): Preview | null => {
    if (!aim || !humanTurn) return null
    const problem = placementProblem(map, castles, aim.at, minDist)
    if (problem) {
      const conflicts = new Set<number>()
      castles.forEach((c, i) => {
        if (Math.hypot(c.at[0] - aim.at[0], c.at[1] - aim.at[1]) < minDist) conflicts.add(i)
      })
      return {
        at: aim.at,
        cell: null,
        conflicts,
        info: { lines: [t.preview[problem]], warn: true },
      }
    }
    const next = [...castles, { at: aim.at, owner: mover }]
    const cell = cells(map, next)[next.length - 1]!
    const land = (landAreaIn(map, cell) / map.landArea) * LAND_POINTS
    const owner = (p: Vec2) => {
      const i = nearestCastle(castles, p)
      return i < 0 ? null : castles[i]!.owner
    }
    const captured = (p: Vec2) => nearestCastle(next, p) === next.length - 1 && owner(p) !== mover
    const cities = map.level.cities.filter(captured).length
    const mines = map.level.mines.filter(captured).length
    const bonus = cities * 5 + mines * 10
    const gain = [t.preview.land(Math.round(land)), bonus ? t.preview.bonus(bonus, cities, mines) : '']
    return {
      at: aim.at,
      cell,
      conflicts: new Set(),
      info: { lines: [t.preview.title, gain.filter(Boolean).join(', ')], warn: false },
    }
  }, [aim, humanTurn, map, castles, minDist, mover, t])

  const place = (at: Vec2) => {
    if (!humanTurn) return
    const problem = placementProblem(map, castles, at, minDist)
    if (problem) {
      flash(t.preview[problem])
      return
    }
    setCastles([...castles, { at, owner: mover }])
    setAim(touch ? null : aim)
  }

  const result = winner(exact.scores)
  const resultTitle =
    result === null
      ? t.result.draw
      : vsComputer
        ? result === 0
          ? t.result.won
          : t.result.lost
        : t.result.playerWins(names[result])
  const castleNumber = Math.min(perPlayer, Math.floor(turn / 2) + 1)
  const status = computerTurn
    ? t.turn.computer
    : over
      ? null
      : vsComputer
        ? t.turn.yours
        : t.turn.player(names[mover])
  const heatFor = vsComputer
    ? mover === 0
      ? t.theory.heatFor.you
      : t.theory.heatFor.computer
    : mover === 0
      ? t.theory.heatFor.blue
      : t.theory.heatFor.orange

  return (
    <div className={styles.game} data-castles={castles.length} data-turn={turn}>
      <GameHeader
        title={t.title}
        subtitle={over ? t.subtitleOver(vsComputer) : t.subtitle(vsComputer, castleNumber, perPlayer)}
        status={<ScoreCards scores={exact.scores} names={names} active={over ? null : mover} t={t} />}
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
          <MapBoard
            prep={prep}
            castles={castles}
            minDist={minDist}
            label={t.board(t.maps[level.name] ?? level.name)}
            conflicts={preview?.conflicts}
            under={
              <>
                {theory && layers.heat && heat?.turn === turn && <HeatLayer grid={heat.grid} />}
                {preview?.cell && <PreviewCell cell={preview.cell} owner={mover} />}
              </>
            }
          >
            {theory && <TheoryLayerFor castles={castles} frame={map.frame} layers={layers} />}
            {preview && (
              <Ghost at={preview.at} owner={mover} minDist={minDist} info={preview.info} frame={map.frame} />
            )}
            <AimControls
              bounds={map.frame}
              enabled={humanTurn && overlay === null}
              onAim={setAim}
              onPlace={place}
              onShortTouch={() => flash(t.hintHold)}
            />
          </MapBoard>
          {notice && (
            <div className={styles.notice} role="status">
              {notice}
            </div>
          )}
        </div>
        {theory && (
          <TheoryPanel
            layers={layers}
            setLayers={setLayers}
            heatFor={heatFor}
            heatLoading={wantHeat && heat?.turn !== turn}
            t={t}
            onClose={() => setTheory(false)}
          />
        )}
      </main>
      <footer className={styles.footer}>
        {status && (
          <span className={styles.turn} data-testid="turn">
            <span
              className={styles.playerDot}
              style={{ background: mover === 0 ? 'var(--player-1)' : 'var(--player-2)' }}
              aria-hidden="true"
            />
            {status}
          </span>
        )}
        <span className={styles.hint}>
          {over ? t.hintOver : computerTurn ? t.hintComputer : touch ? t.hintTouch : t.hintMouse}
        </span>
      </footer>
      {overlay === 'howto' && (
        <HowToOverlay
          animation={<HowToAnimation label={t.howToAnimation} />}
          onClose={() => {
            prefs.setSeenHowTo()
            setOverlay(null)
          }}
        >
          {t.howTo.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </HowToOverlay>
      )}
      {overlay === 'result' && (
        <ResultScreen
          outcome={vsComputer && result === 1 ? 'lost' : 'won'}
          title={resultTitle}
          stats={t.result.stats(names[0], exact.scores[0].total, names[1], exact.scores[1].total)}
          explanation={t.explanation.join(' ')}
          animation={
            <GrowingCircles
              map={map}
              castles={castles}
              land={prep.drawing.land}
              label={t.explanationAnimation}
              replay={t.replay}
            />
          }
          onTheory={() => {
            setOverlay(null)
            setTheory(true)
          }}
          leaderboard={
            vsComputer
              ? {
                  board: `${level.id}/${perPlayer}/${aiLevel}`,
                  spec: { higherIsBetter: true },
                  score: exact.scores[0].total,
                  format: t.result.score,
                }
              : undefined
          }
          onAgain={onNew}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  )
}

/** Voronoi diagram (over the whole sheet), Delaunay triangles and circumcircles of the castles. */
function TheoryLayerFor({
  castles,
  frame,
  layers,
}: {
  castles: readonly Castle[]
  frame: GameMap['frame']
  layers: TheoryLayers
}) {
  const delaunay = useMemo(
    () => (castles.length ? Delaunay.from(castles.map((c) => [c.at[0], c.at[1]])) : null),
    [castles],
  )
  const voronoiPath = useMemo(
    () => delaunay?.voronoi([frame.minX, frame.minY, frame.maxX, frame.maxY]).render() ?? '',
    [delaunay, frame],
  )
  return <TheoryLayer delaunay={delaunay} voronoiPath={voronoiPath} layers={layers} />
}

/** The map of the setup behind the "Neues Spiel" overlay, without castles. */
function Backdrop({ level, t }: { level: VoronoiLevel; t: VoronoiTexts }) {
  const prep = usePrepared(level)
  return <MapBoard prep={prep} castles={[]} minDist={1} label={t.board(t.maps[level.name] ?? level.name)} />
}

/** "Erobere das Land": build castles in turn; each castle gets the land closest to it (Voronoi game). */
export default function VoronoiGame() {
  const t = useLocalized({ de, en })
  const prefs = usePrefs()
  const difficulty = useSettings((s) => s.difficulty)
  const [game, setGame] = useState<{ n: number; setup: Setup } | null>(null)
  const [choosing, setChoosing] = useState<Setup>(() => ({
    map: prefs.map,
    opponent: prefs.opponent,
    aiLevel: prefs.aiLevel,
    castles: prefs.castles,
  }))
  const [overlay, setOverlay] = useState<'howto' | 'setup' | null>(prefs.seenHowTo ? 'setup' : 'howto')
  const backdrop = useLevel<VoronoiLevel>(choosing.map)
  const played = useLevel<VoronoiLevel>(game?.setup.map ?? choosing.map)
  const defaultLevel = aiLevelFor(difficulty)

  const start = (setup: Setup) => {
    prefs.setSetup(setup)
    setChoosing(setup)
    setGame({ n: (game?.n ?? 0) + 1, setup })
    setOverlay(null)
  }

  return (
    <>
      {game && played.status === 'ready' ? (
        <Match
          key={game.n}
          level={played.value}
          setup={game.setup}
          aiLevel={game.setup.aiLevel ?? defaultLevel}
          t={t}
          onNew={() => setOverlay('setup')}
        />
      ) : (
        <div className={styles.game}>
          <GameHeader title={t.title} />
          <main className={styles.main}>
            <div className={styles.boardArea}>
              {backdrop.status === 'ready' ? (
                <Backdrop level={backdrop.value} t={t} />
              ) : (
                <div className={styles.loading}>{backdrop.status === 'error' ? backdrop.error : '…'}</div>
              )}
            </div>
          </main>
        </div>
      )}
      {overlay === 'howto' && (
        <HowToOverlay
          animation={<HowToAnimation label={t.howToAnimation} />}
          onClose={() => {
            prefs.setSeenHowTo()
            setOverlay('setup')
          }}
        >
          {t.howTo.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </HowToOverlay>
      )}
      {overlay === 'setup' && (
        <SetupOverlay
          initial={choosing}
          defaultLevel={defaultLevel}
          t={t}
          onChange={setChoosing}
          onStart={start}
          onClose={game ? () => setOverlay(null) : undefined}
        />
      )}
    </>
  )
}
