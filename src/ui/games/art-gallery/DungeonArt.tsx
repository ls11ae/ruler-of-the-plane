import { memo, useId, useMemo } from 'react'
import type { Vec2 } from '../../../core/geometry/types'
import type { ArtGalleryLevel } from '../../../core/levels/schema'
import { useBoard } from '../../components/boardContext'
import { floorTile, props } from './art'
import { floorPath, ringPath } from './paths'
import { placeProps } from './props'

/** Grid-paper floor (Scribble tiles) clipped to the dungeon, with a few props as decoration. */
export const DungeonFloor = memo(function DungeonFloor({ level }: { level: ArtGalleryLevel }) {
  const board = useBoard()
  const id = useId().replace(/[^\w-]/g, '')
  const tile = 0.75
  const placed = useMemo(() => placeProps(level, level.number * 101, props.length), [level])
  return (
    <>
      <defs>
        <pattern id={`floor-${id}`} patternUnits="userSpaceOnUse" width={tile} height={tile}>
          <rect width={tile} height={tile} fill="var(--paper)" />
          <image href={floorTile} width={tile} height={tile} preserveAspectRatio="none" />
        </pattern>
      </defs>
      <path d={floorPath(level)} fill={`url(#floor-${id})`} fillRule="evenodd" />
      {placed.map((p, i) => (
        <image
          key={i}
          href={props[p.kind]}
          x={p.at[0] - p.size / 2}
          y={p.at[1] - p.size / 2}
          width={p.size}
          height={p.size}
          opacity={0.85}
          transform={board.upright(p.at[0], p.at[1])}
        />
      ))}
    </>
  )
})

/** Walls: thick, slightly wobbly ink lines around the dungeon and the pillars. */
export const DungeonWalls = memo(function DungeonWalls({ level }: { level: ArtGalleryLevel }) {
  const board = useBoard()
  return (
    <path
      d={floorPath(level)}
      fill="none"
      stroke="var(--ink)"
      strokeWidth={board.pxToBoard(6)}
      strokeLinejoin="round"
      filter={board.ink}
      pointerEvents="none"
    />
  )
})

/**
 * Pulsing marker on the thickest dark spot while the dungeon is not fully lit (the 2020 version added
 * such a feedback point after its user study).
 */
export function DarkHint({ at }: { at: Vec2 }) {
  const board = useBoard()
  const r = board.pxToBoard(11)
  return (
    <g pointerEvents="none" data-testid="dark-hint">
      <circle cx={at[0]} cy={at[1]} r={r} fill="none" stroke="#fff6dc" strokeWidth={board.pxToBoard(3)}>
        <animate attributeName="r" values={`${r};${r * 1.8};${r}`} dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={at[0]} cy={at[1]} r={r * 0.35} fill="#fff6dc" />
    </g>
  )
}

/** Warm light in each torch's visibility polygon, brightest at the torch; the dark rest in slate. */
export function LightLayer({
  torches,
  visibility,
  dark,
  outline,
}: {
  torches: readonly Vec2[]
  visibility: readonly (readonly Vec2[])[]
  dark: readonly (readonly Vec2[])[]
  /** Visibility polygon to outline (the torch being dragged or hovered). */
  outline?: readonly Vec2[] | undefined
}) {
  const board = useBoard()
  const id = useId().replace(/[^\w-]/g, '')
  return (
    <g pointerEvents="none">
      <defs>
        {torches.map(([x, y], i) => (
          <radialGradient
            key={i}
            id={`light-${id}-${i}`}
            gradientUnits="userSpaceOnUse"
            cx={x}
            cy={y}
            r={4.5}
          >
            <stop offset="0" stopColor="#ffc93c" stopOpacity={0.7} />
            <stop offset="0.3" stopColor="#ffd970" stopOpacity={0.5} />
            <stop offset="1" stopColor="#ffe9a8" stopOpacity={0.4} />
          </radialGradient>
        ))}
      </defs>
      {visibility.map((vis, i) => (
        <path key={i} d={ringPath(vis)} fill={`url(#light-${id}-${i})`} />
      ))}
      {dark.length > 0 && (
        <path d={dark.map(ringPath).join('')} fill="var(--dark)" fillOpacity={0.84} fillRule="nonzero" />
      )}
      {outline && (
        <path
          d={ringPath(outline)}
          fill="none"
          stroke="var(--warn)"
          strokeWidth={board.pxToBoard(2.5)}
          strokeDasharray={`${board.pxToBoard(9)} ${board.pxToBoard(6)}`}
          strokeLinejoin="round"
        />
      )}
    </g>
  )
}
