import { cartography } from '../art/cartography'
import { offsetRing, smoothClosedPath, smoothOpenPath, type Pt } from '../art/sketch'
import type { MapLayout, PlaceId, Sprite } from './mapLayout'

/** Contour lines around coasts: distance outwards and opacity. */
const COAST_LINES: [number, number][] = [
  [30, 0.16],
  [20, 0.24],
  [11, 0.34],
]

function Coast({ ring, lines = COAST_LINES }: { ring: Pt[]; lines?: [number, number][] }) {
  return (
    <g filter="url(#ink)">
      {lines.map(([d, opacity]) => (
        <path
          key={d}
          d={smoothClosedPath(offsetRing(ring, d))}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity={opacity}
          strokeWidth={1.6}
        />
      ))}
      <path
        d={smoothClosedPath(ring)}
        fill="var(--land-wash)"
        stroke="var(--ink)"
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
    </g>
  )
}

function SpriteImage({ sprite }: { sprite: Sprite }) {
  const [x, y] = sprite.at
  const s = sprite.size
  return (
    <g>
      <image href={cartography[sprite.icon]} x={x - s / 2} y={y - s / 2} width={s} height={s} />
      {sprite.flag && (
        <g>
          <line
            x1={x + s * 0.02}
            y1={y - s * 0.42}
            x2={x + s * 0.02}
            y2={y - s * 0.74}
            stroke="var(--ink)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <path
            d={`M${x + s * 0.02},${y - s * 0.74} L${x + s * 0.3},${y - s * 0.67} L${x + s * 0.02},${y - s * 0.6} Z`}
            fill={`var(--${sprite.flag})`}
            stroke="var(--ink)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </g>
      )}
    </g>
  )
}

/** The drawn map: sea marks, the island with its coast lines, the lake, roads and the place icons. */
export function MapArt({ layout, hidden }: { layout: MapLayout; hidden: ReadonlySet<PlaceId> }) {
  const sprites = Object.entries(layout.sprites).flatMap(([place, list]) =>
    hidden.has(place as PlaceId) ? [] : (list ?? []),
  )
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden="true"
      focusable="false"
    >
      {layout.waves.map(([x, y]) => (
        <image
          key={`${x},${y}`}
          href={cartography.textureWater}
          x={x - 30}
          y={y - 30}
          width={60}
          height={60}
          opacity={0.5}
        />
      ))}
      <Coast ring={layout.island} />
      <Coast
        ring={layout.islet}
        lines={[
          [16, 0.2],
          [8, 0.32],
        ]}
      />
      <g filter="url(#ink)">
        <path
          d={smoothClosedPath(layout.lake)}
          fill="var(--water)"
          fillOpacity={0.8}
          stroke="var(--ink)"
          strokeWidth={3.5}
        />
        <path
          d={smoothClosedPath(offsetRing(layout.lake, -7))}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity={0.3}
          strokeWidth={1.4}
        />
      </g>
      <path
        d={smoothOpenPath(layout.walk)}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="0.1 8"
      />
      {layout.roads.map((road, i) => (
        <path
          key={i}
          d={smoothOpenPath(road)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="9 7"
        />
      ))}
      {sprites.map((sprite, i) => (
        <SpriteImage key={i} sprite={sprite} />
      ))}
    </svg>
  )
}
