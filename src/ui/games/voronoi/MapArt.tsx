import type { GameMap } from '../../../core/games/voronoi/map'
import { CITY_BONUS, MINE_BONUS, type Player } from '../../../core/games/voronoi/rules'
import type { Vec2 } from '../../../core/geometry/types'
import { useBoard } from '../../components/boardContext'
import { art } from './art'
import { PLAYER_COLOURS, type MapDrawing } from './drawing'

/** Sea marks, contour lines off the coast, the land and the inland water. */
export function MapBase({ map, drawing }: { map: GameMap; drawing: MapDrawing }) {
  const board = useBoard()
  const f = map.frame
  const wave = 0.95
  return (
    <g aria-hidden="true">
      {drawing.waves.map(([x, y]) => (
        <image
          key={`${x},${y}`}
          href={art.waves}
          x={x - wave / 2}
          y={y - wave / 2}
          width={wave}
          height={wave}
          opacity={0.45}
          transform={board.upright(x, y)}
        />
      ))}
      <g filter={board.ink}>
        {drawing.coastLines.map((line) => (
          <path
            key={line.opacity}
            d={line.d}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity={line.opacity}
            strokeWidth={board.pxToBoard(1.5)}
          />
        ))}
      </g>
      <path d={drawing.land} fill="var(--land-wash)" fillRule="evenodd" />
      <path d={drawing.water} fill="var(--water)" fillOpacity={0.85} />
      <rect
        x={f.minX}
        y={f.minY}
        width={f.maxX - f.minX}
        height={f.maxY - f.minY}
        fill="none"
        stroke="var(--ink)"
        strokeOpacity={0.5}
        strokeWidth={board.pxToBoard(2)}
      />
    </g>
  )
}

function Icon({ href, at, size }: { href: string; at: Vec2; size: number }) {
  const board = useBoard()
  const [x, y] = at
  return (
    <image
      href={href}
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      transform={board.upright(x, y)}
    />
  )
}

/** Forests and mountains (decoration). */
export function MapDecor({ map }: { map: GameMap }) {
  return (
    <g aria-hidden="true" opacity={0.85}>
      {map.level.forests.map((p, i) => (
        <Icon key={`f${i}`} href={art.forest} at={p} size={0.8} />
      ))}
      {map.level.mountains.map((p, i) => (
        <Icon key={`m${i}`} href={art.mountain} at={p} size={0.85} />
      ))}
    </g>
  )
}

/** The coast in ink, on top of the territories. */
export function MapCoast({ drawing }: { drawing: MapDrawing }) {
  const board = useBoard()
  return (
    <path
      d={drawing.land}
      fill="none"
      stroke="var(--ink)"
      strokeWidth={board.pxToBoard(3.5)}
      strokeLinejoin="round"
      filter={board.ink}
      aria-hidden="true"
    />
  )
}

/** A bonus badge ("+5"), ringed in the owner's colour. */
function Badge({ at, points, owner }: { at: Vec2; points: number; owner: Player | null }) {
  const board = useBoard()
  const r = board.pxToBoard(14)
  const [x, y] = at
  return (
    <g transform={board.upright(x, y)}>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="var(--paper)"
        stroke={owner === null ? 'var(--ink)' : PLAYER_COLOURS[owner]}
        strokeWidth={board.pxToBoard(owner === null ? 2 : 3)}
      />
      <text
        x={x}
        y={y + r * 0.36}
        textAnchor="middle"
        fontSize={r * 1.05}
        fontFamily="var(--font-text)"
        fill="var(--ink)"
      >
        +{points}
      </text>
    </g>
  )
}

/** Cities and gold mines with their bonus, the badge ringed in the colour of whoever owns them. */
export function Bonuses({ map, owners }: { map: GameMap; owners: (p: Vec2) => Player | null }) {
  const board = useBoard()
  const badge = (p: Vec2): Vec2 => {
    // Upper right of the icon on screen, also on a turned board (rotate(90): screen up is board −x).
    const d = 0.38
    return board.rotation ? [p[0] - d, p[1] - d] : [p[0] + d, p[1] - d]
  }
  return (
    <g>
      {map.level.cities.map((p, i) => (
        <g key={`c${i}`}>
          <Icon href={art.city} at={p} size={0.78} />
          <Badge at={badge(p)} points={CITY_BONUS} owner={owners(p)} />
        </g>
      ))}
      {map.level.mines.map((p, i) => (
        <g key={`m${i}`}>
          <Icon href={art.mine} at={p} size={0.78} />
          <Badge at={badge(p)} points={MINE_BONUS} owner={owners(p)} />
        </g>
      ))}
    </g>
  )
}
