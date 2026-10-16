import { useId, useMemo, useState } from 'react'
import { cells, type Castle } from '../../../core/games/voronoi/rules'
import type { GameMap } from '../../../core/games/voronoi/map'
import { Button } from '../../components/Button'
import { PLAYER_COLOURS, ringPath } from './drawing'
import styles from './Voronoi.module.css'

const GROW_S = 3.2

/**
 * How the regions arise: circles grow from all castles at the same speed, each filling only its own
 * region; where two circles meet lies the border. Then the borders are drawn in.
 */
export function GrowingCircles({
  map,
  castles,
  land,
  label,
  replay,
}: {
  map: GameMap
  castles: readonly Castle[]
  land: string
  label: string
  replay: string
}) {
  const [run, setRun] = useState(0)
  const id = useId().replace(/[^\w-]/g, '')
  const regions = useMemo(() => cells(map, castles), [map, castles])
  const f = map.frame
  const reach = regions.map((cell, i) =>
    Math.max(0, ...cell.map(([x, y]) => Math.hypot(x - castles[i]!.at[0], y - castles[i]!.at[1]))),
  )
  const maxReach = Math.max(1, ...reach)
  return (
    <div>
      <svg
        key={run}
        viewBox={`${f.minX - 0.2} ${f.minY - 0.2} ${f.maxX - f.minX + 0.4} ${f.maxY - f.minY + 0.4}`}
        className={styles.animationSvg}
        role="img"
        aria-label={label}
      >
        <defs>
          <clipPath id={`${id}-land`}>
            <path d={land} clipRule="evenodd" />
          </clipPath>
          {regions.map((cell, i) => (
            <clipPath key={i} id={`${id}-c${i}`}>
              <path d={ringPath(cell)} />
            </clipPath>
          ))}
        </defs>
        <rect x={f.minX} y={f.minY} width={f.maxX - f.minX} height={f.maxY - f.minY} fill="var(--card)" />
        <path d={land} fill="var(--land-wash)" fillRule="evenodd" stroke="var(--ink)" strokeWidth={0.06} />
        <g clipPath={`url(#${id}-land)`}>
          {castles.map((c, i) => (
            <circle
              key={i}
              cx={c.at[0]}
              cy={c.at[1]}
              r={0}
              fill={PLAYER_COLOURS[c.owner]}
              fillOpacity={0.45}
              clipPath={`url(#${id}-c${i})`}
            >
              <animate
                attributeName="r"
                from="0"
                to={String(maxReach)}
                dur={`${GROW_S}s`}
                begin="0.3s"
                fill="freeze"
              />
            </circle>
          ))}
          <g opacity={0}>
            {regions.map((cell, i) => (
              <path key={i} d={ringPath(cell)} fill="none" stroke="var(--ink)" strokeWidth={0.05} />
            ))}
            <animate
              attributeName="opacity"
              from="0"
              to="1"
              dur="0.6s"
              begin={`${GROW_S * 0.75}s`}
              fill="freeze"
            />
          </g>
        </g>
        {castles.map((c, i) => (
          <circle
            key={i}
            cx={c.at[0]}
            cy={c.at[1]}
            r={0.17}
            fill={PLAYER_COLOURS[c.owner]}
            stroke="var(--ink)"
            strokeWidth={0.05}
          />
        ))}
      </svg>
      <Button small onClick={() => setRun(run + 1)}>
        {replay}
      </Button>
    </div>
  )
}
