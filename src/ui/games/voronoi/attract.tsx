import { useEffect, useState } from 'react'
import { minDistance, type Castle, type Player } from '../../../core/games/voronoi/rules'
import type { VoronoiLevel } from '../../../core/levels/schema'
import type { AttractProps } from '../registry'
import { useLevel } from '../../levels'
import { askAi } from './aiClient'
import { MapBoard } from './MapBoard'
import { usePrepared } from './prepared'
import { MAPS } from './store'

/** Castles per player in the demo, and the pace: a castle every so often, a pause after the game. */
const PER_PLAYER = 8
const STEP_MS = 900
const PAUSE_MS = 4000

function Demo({ level, onDone }: { level: VoronoiLevel; onDone: () => void }) {
  const prep = usePrepared(level)
  const minDist = minDistance(prep.map, PER_PLAYER)
  const [castles, setCastles] = useState<Castle[]>([])
  const [passes, setPasses] = useState(0)
  const turn = castles.length + passes

  useEffect(() => {
    let live = true
    let timer: number | undefined
    if (turn >= 2 * PER_PLAYER) {
      timer = window.setTimeout(onDone, PAUSE_MS)
      return () => window.clearTimeout(timer)
    }
    const player = (turn % 2) as Player
    const started = performance.now()
    void askAi({
      kind: 'move',
      level,
      move: {
        castles,
        player,
        minDist,
        opponentMovesLeft: turn + 1 < 2 * PER_PLAYER,
        level: player === 0 ? 'normal' : 'hard',
      },
      seed: 1000 * level.number + turn,
    }).then(({ at }) => {
      timer = window.setTimeout(
        () => {
          if (!live) return
          if (at) setCastles((cs) => [...cs, { at, owner: player }])
          else setPasses((p) => p + 1)
        },
        Math.max(0, STEP_MS - (performance.now() - started)),
      )
    })
    return () => {
      live = false
      window.clearTimeout(timer)
    }
    // One move per turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn])

  return (
    <div data-step={turn} style={{ width: '100%', height: '100%' }}>
      <MapBoard prep={prep} castles={castles} minDist={minDist} label="" />
    </div>
  )
}

/** Attract demo of "Erobere das Land": the computer plays against itself, one map per turn. */
export default function VoronoiAttract({ round, onDone }: AttractProps) {
  const level = useLevel<VoronoiLevel>(MAPS[round % MAPS.length]!)
  if (level.status !== 'ready') return null
  return <Demo level={level.value} onDone={onDone} />
}
