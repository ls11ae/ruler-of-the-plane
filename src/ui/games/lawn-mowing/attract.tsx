import { useEffect, useMemo, useState } from 'react'
import { MARGIN } from '../../../core/games/lawn-mowing/game'
import { makeLawn, Mowing } from '../../../core/games/lawn-mowing/mowing'
import type { LawnId } from '../../../core/games/lawn-mowing/rules'
import { positionsOf } from '../../../core/games/lawn-mowing/tour'
import type { Vec2 } from '../../../core/geometry/types'
import type { LawnMowingLevel } from '../../../core/levels/schema'
import { Board } from '../../components/Board'
import { useAnimationFrame } from '../../input/hooks'
import { useLevel } from '../../levels'
import type { AttractProps } from '../registry'
import { CutterTokens, Tours, type CutterView } from './Cutters'
import { boardBounds } from './geometry'
import { LawnBase, LawnOutline, Mowed, Paper } from './LawnArt'

/** The lawns of the demo, one per round, with the number of mowers of the solver's tours shown. */
const DEMO: readonly { lawn: LawnId; cutters: number }[] = [
  { lawn: 'lawn-mowing/lawn3', cutters: 2 },
  { lawn: 'lawn-mowing/lawn2', cutters: 1 },
  { lawn: 'lawn-mowing/lawn5', cutters: 2 },
  { lawn: 'lawn-mowing/lawn1', cutters: 2 },
]
/** The longest tour takes this long; then a pause on the mowed lawn. */
const TOUR_MS = 17_000
const END_MS = 3000

function Demo({ level, cutters, onDone }: { level: LawnMowingLevel; cutters: number; onDone: () => void }) {
  const lawn = useMemo(() => makeLawn(level.outer, level.holes, level.cutter, level.cutterCenter), [level])
  const walks = useMemo(
    () =>
      (level.variants.find((v) => v.cutters === cutters)?.solution?.tours ?? []).map((t) => positionsOf(t)),
    [level, cutters],
  )
  const steps = Math.max(1, ...walks.map((w) => w.length - 1))
  const stepMs = TOUR_MS / steps
  const [start] = useState(() => performance.now())
  const [step, setStep] = useState(0)
  const [over, setOver] = useState(false)
  useAnimationFrame((now) => {
    const s = Math.floor((now - start) / stepMs)
    if (s !== step) setStep(Math.min(steps, s))
    if (now - start >= TOUR_MS + END_MS) setOver(true)
  }, !over)
  useEffect(() => {
    if (over || !walks.length) onDone()
  }, [over, walks.length, onDone])

  // Mowed so far: the footprints at every position up to this step (a few hundred cells, per step).
  const mowed = useMemo(() => {
    const m = new Mowing(lawn)
    for (const w of walks) for (const p of w.slice(0, step + 1)) m.mowAt(p)
    return lawn.cells.cells().filter(([x, y]) => m.isMowed(x, y))
  }, [lawn, walks, step])
  const at = (w: readonly Vec2[]) => w[Math.min(step, w.length - 1)]!
  const views: CutterView[] = walks.map((w) => ({
    start: w[0]!,
    at: at(w),
    walk: w.slice(0, Math.min(step, w.length - 1) + 1),
    home: [],
  }))
  const bounds = boardBounds(level, MARGIN + 1)
  return (
    <div data-step={step} style={{ width: '100%', height: '100%' }}>
      <Board bounds={bounds} padding={0} autoRotate>
        <Paper bounds={bounds} />
        <LawnBase level={level} />
        <Mowed cells={mowed} />
        <LawnOutline level={level} />
        <Tours lawn={lawn} cutters={views} />
        <CutterTokens lawn={lawn} cutters={views} />
      </Board>
    </div>
  )
}

/**
 * Attract demo of "Rasenmähen": the solver's tours mow a lawn, all mowers at once, until it is done.
 * A different lawn each round.
 */
export default function LawnMowingAttract({ round, onDone }: AttractProps) {
  const { lawn, cutters } = DEMO[round % DEMO.length]!
  const level = useLevel<LawnMowingLevel>(lawn)
  if (level.status !== 'ready') return null
  return <Demo level={level.value} cutters={cutters} onDone={onDone} />
}
