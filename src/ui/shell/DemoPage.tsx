import { useState } from 'react'
import { pointInRing } from '../../core/geometry/polygon'
import type { Vec2 } from '../../core/geometry/types'
import type { ArtGalleryLevel } from '../../core/levels/schema'
import { Board } from '../components/Board'
import { useBoard } from '../components/boardContext'
import { Button } from '../components/Button'
import { GameHeader } from '../components/GameHeader'
import { HowToOverlay } from '../components/HowToOverlay'
import { Keycap } from '../components/Keycap'
import { ProgressBar } from '../components/ProgressBar'
import { ResultScreen } from '../components/ResultScreen'
import { VersusCounter } from '../components/VersusCounter'
import { useT } from '../i18n'
import { useHeldKeys, usePointerGesture } from '../input/hooks'
import { useLevel } from '../levels'
import styles from './DemoPage.module.css'

const DEMO_LEVEL = 'art-gallery/agLevel4_8'
const DEMO_KEYS = ['KeyA', 'KeyL', 'KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']

function inside(level: ArtGalleryLevel, p: Vec2): boolean {
  return pointInRing(p, level.outer) === 1 && level.holes.every((h) => pointInRing(p, h) !== 1)
}

const path = (ring: readonly Vec2[]) => `M${ring.map(([x, y]) => `${x},${y}`).join('L')}Z`

/** Tokens on the dungeon: tap to place, drag to move, drag out to remove (as in "Licht ins Verlies"). */
function Tokens({
  level,
  tokens,
  setTokens,
}: {
  level: ArtGalleryLevel
  tokens: Vec2[]
  setTokens: (f: (t: Vec2[]) => Vec2[]) => void
}) {
  const board = useBoard()
  const [dragging, setDragging] = useState<number | null>(null)
  const radius = board.pxToBoard(22) // 44 px hit target
  const pick = (e: React.PointerEvent) => {
    const p = board.toBoard(e.clientX, e.clientY)
    const i = tokens.findIndex(([x, y]) => Math.hypot(x - p[0], y - p[1]) <= radius)
    return { p, i }
  }
  const gesture = usePointerGesture({
    onPress: (e) => setDragging(pick(e).i >= 0 ? pick(e).i : null),
    onTap: (e) => {
      const { p, i } = pick(e)
      if (i < 0 && inside(level, p)) setTokens((t) => [...t, p])
      setDragging(null)
    },
    onDragMove: (e) => {
      if (dragging === null) return
      const p = board.toBoard(e.clientX, e.clientY)
      setTokens((t) => t.map((q, i) => (i === dragging ? p : q)))
    },
    onDragEnd: (e) => {
      if (dragging !== null && !inside(level, board.toBoard(e.clientX, e.clientY))) {
        setTokens((t) => t.filter((_, i) => i !== dragging))
      }
      setDragging(null)
    },
  })
  const b = level.bounds
  return (
    <>
      <rect
        x={b.minX - 1}
        y={b.minY - 1}
        width={b.maxX - b.minX + 2}
        height={b.maxY - b.minY + 2}
        fill="transparent"
        style={{ cursor: dragging === null ? 'crosshair' : 'grabbing' }}
        {...gesture}
      />
      {tokens.map(([x, y], i) => (
        <g key={i} pointerEvents="none">
          <circle
            cx={x}
            cy={y}
            r={radius * 0.7}
            fill="var(--light)"
            stroke="var(--ink)"
            strokeWidth={radius * 0.12}
          />
          <circle cx={x} cy={y} r={radius * 0.28} fill="var(--warn)" />
        </g>
      ))}
    </>
  )
}

function Dungeon({ level }: { level: ArtGalleryLevel }) {
  const board = useBoard()
  return (
    <path
      d={path(level.outer) + level.holes.map(path).join('')}
      fill="var(--light-soft)"
      fillRule="evenodd"
      stroke="var(--ink)"
      strokeWidth={board.pxToBoard(5)}
      strokeLinejoin="round"
      filter={board.ink}
    />
  )
}

/** `#/demo`: the shared UI components in one place (for development and the CI screenshots). */
export function DemoPage() {
  const t = useT()
  const level = useLevel<ArtGalleryLevel>(DEMO_LEVEL)
  const held = useHeldKeys()
  const [tokens, setTokens] = useState<Vec2[]>([])
  const [overlay, setOverlay] = useState<'howto' | 'result' | null>(null)
  const share = Math.min(1, tokens.length / 8)

  return (
    <div className={styles.page}>
      <GameHeader
        title={t.demo.title}
        subtitle={t.demo.subtitle}
        status={
          <span className={styles.status}>
            {t.demo.tokens(tokens.length)}
            <span className={styles.big}>{Math.round(share * 100)} %</span>
            <ProgressBar value={share} label={t.demo.share} />
          </span>
        }
        actions={
          <>
            <Button onClick={() => setOverlay('howto')}>{t.game.howTo}</Button>
            <Button onClick={() => setOverlay('result')}>{t.demo.result}</Button>
          </>
        }
      />
      <main className={styles.main}>
        {level.status === 'ready' && (
          <Board bounds={level.value.bounds} padding={0.4} label={t.demo.title}>
            <Dungeon level={level.value} />
            <Tokens level={level.value} tokens={tokens} setTokens={setTokens} />
          </Board>
        )}
        {level.status === 'error' && <p>{level.error}</p>}
      </main>
      <footer className={styles.footer}>
        <span>{t.demo.hint}</span>
        <span className={styles.keys}>
          {t.demo.keysHint}
          {DEMO_KEYS.map((code) => (
            <Keycap key={code} code={code} pressed={held.includes(code)} />
          ))}
        </span>
        <VersusCounter />
      </footer>
      {overlay === 'howto' && (
        <HowToOverlay
          onClose={() => setOverlay(null)}
          keys={[
            { codes: ['KeyA'], label: t.demo.owner },
            { codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], label: t.demo.mower1 },
            { codes: ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], label: t.demo.mower2 },
          ]}
        >
          <p>{t.demo.howTo}</p>
        </HowToOverlay>
      )}
      {overlay === 'result' && (
        <ResultScreen
          outcome="won"
          stars={Math.min(3, tokens.length)}
          record={tokens.length > 0 && tokens.length < 3}
          stats={t.demo.score(tokens.length)}
          explanation={t.demo.explanation}
          leaderboard={{
            board: 'demo/tokens',
            spec: { higherIsBetter: false },
            score: Math.max(1, tokens.length),
            format: t.demo.score,
          }}
          onAgain={() => {
            setTokens([])
            setOverlay(null)
          }}
          onTheory={() => setOverlay(null)}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  )
}
