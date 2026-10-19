import { useEffect, useMemo, useState } from 'react'
import { thickestDarkSpot } from '../../../core/games/art-gallery/coverage'
import { DEMO_LEVELS, DEMO_TORCHES } from '../../../core/games/art-gallery/demo'
import { levelId } from '../../../core/games/art-gallery/rules'
import type { Vec2 } from '../../../core/geometry/types'
import type { ArtGalleryLevel } from '../../../core/levels/schema'
import { Board } from '../../components/Board'
import { useBoard } from '../../components/boardContext'
import { useAnimationFrame } from '../../input/hooks'
import { useLevel } from '../../levels'
import type { AttractProps } from '../registry'
import { DarkHint, DungeonFloor, DungeonWalls, LightLayer } from './DungeonArt'
import { makeLighting } from './lighting'
import { ringPath } from './paths'
import styles from './ArtGallery.module.css'
import { Torch } from './Torch'

/** The dark dungeon first, then a torch every so often; the light spreads from each one. */
const INTRO_MS = 1200
const SPREAD_MS = 1100
/** Before the last torch, the last dark spot pulses this long. */
const HINT_MS = 1800
const END_MS = 3500

const easeOut = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3

/** The new torch's light, growing from the torch over the dark (scaled about the torch). */
function Spread({ at, polygon, f }: { at: Vec2; polygon: readonly Vec2[]; f: number }) {
  const [x, y] = at
  return (
    <path
      d={ringPath(polygon)}
      transform={`translate(${x} ${y}) scale(${f}) translate(${-x} ${-y})`}
      fill="#ffe9a8"
      fillOpacity={0.92}
      pointerEvents="none"
    />
  )
}

function Tokens({ torches }: { torches: readonly Vec2[] }) {
  const board = useBoard()
  return torches.map((at, i) => <Torch key={i} at={at} radius={board.pxToBoard(18)} />)
}

function Demo({
  level,
  torches,
  onDone,
}: {
  level: ArtGalleryLevel
  torches: readonly Vec2[]
  onDone: () => void
}) {
  const k = torches.length
  const lighting = useMemo(() => makeLighting(level), [level])
  // The light after each torch, and the last dark spot: computed once, not per frame.
  const lights = useMemo(
    () => [lighting.light([]), ...torches.map((_, i) => lighting.light(torches.slice(0, i + 1)))],
    [lighting, torches],
  )
  const lastSpot = useMemo(() => thickestDarkSpot(lights[k - 1]!.coverage.darkPaths)?.at ?? null, [lights, k])
  const per = Math.min(5500, Math.max(2400, 21000 / k))
  const appear = (i: number) => INTRO_MS + i * per + (i === k - 1 ? HINT_MS : 0)
  const total = appear(k - 1) + SPREAD_MS + END_MS

  const [start] = useState(() => performance.now())
  const [t, setT] = useState(0)
  useAnimationFrame((now) => setT(now - start), t < total)
  const over = t >= total
  useEffect(() => {
    if (over) onDone()
  }, [over, onDone])

  const shown = torches.filter((_, i) => t >= appear(i)).length
  const settled = torches.filter((_, i) => t >= appear(i) + SPREAD_MS).length
  const lit = lights[settled]!
  const spreading = shown > settled ? shown - 1 : null
  return (
    <div data-step={shown + settled} className={styles.rock} style={{ width: '100%', height: '100%' }}>
      <Board bounds={level.bounds} padding={0.35} autoRotate>
        <DungeonFloor level={level} />
        <LightLayer
          torches={torches.slice(0, settled)}
          visibility={lit.visibility}
          dark={lit.coverage.fullyLit ? [] : lit.coverage.dark}
        />
        {spreading !== null && (
          <Spread
            at={torches[spreading]!}
            polygon={lighting.visibility(torches[spreading]!)}
            f={easeOut((t - appear(spreading)) / SPREAD_MS)}
          />
        )}
        <DungeonWalls level={level} />
        {lastSpot && shown === k - 1 && settled === k - 1 && <DarkHint at={lastSpot} />}
        <Tokens torches={torches.slice(0, shown)} />
      </Board>
    </div>
  )
}

/**
 * Attract demo of "Licht ins Verlies": torches are placed one by one in a dark dungeon, the light
 * spreads from each, and the last dark spot pulses until the last torch lights it. A different
 * dungeon each round; the torches were found offline (`scripts/art-gallery/demo-torches.ts`).
 */
export default function ArtGalleryAttract({ round, onDone }: AttractProps) {
  const name = DEMO_LEVELS[round % DEMO_LEVELS.length]!
  const level = useLevel<ArtGalleryLevel>(levelId(name))
  if (level.status !== 'ready') return null
  return <Demo level={level.value} torches={DEMO_TORCHES[name]} onDone={onDone} />
}
