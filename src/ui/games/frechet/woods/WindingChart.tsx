import type { WoodsWalk } from '../../../../core/games/frechet/woods/levels'
import { START_WINDINGS } from '../../../../core/games/frechet/woods/shapes'
import type { FrechetTexts } from '../i18n.de'
import type { WoodsTexts } from './i18n.de'
import woods from './Woods.module.css'

const W = 320
const H = 168
const LEFT = 14
const RIGHT = W - 8
const TOP = 26
const BASE = 118

/** A zigzag across a bar (x … x + width) at height y. */
const zigzag = (x: number, y: number, width: number) =>
  `M${x - 2},${y} l${width / 4 + 1},-3 l${width / 4},3 l${width / 4},-3 l${width / 4 + 1},3`

/** A small round arrow at (x, y) for the axis labels (clockwise on screen, or anticlockwise). */
function Turn({ x, y, clockwise }: { x: number; y: number; clockwise: boolean }) {
  const s = clockwise ? 1 : -1
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s} 1)`}
      fill="none"
      stroke="var(--ink)"
      strokeWidth={1.6}
      strokeLinecap="round"
    >
      <path d="M0 -5a5 5 0 1 1 -4.6 3" />
      <path d="M0 -5 -2.6 -7M0 -5 -2.4 -2.4" />
    </g>
  )
}

/**
 * "Shortest leash for each start winding" (free start leash): one bar per way the leash can lie at
 * the gate (−3 … 3 turns round the gate post), the walk's leash as a dashed line, the best start and
 * the player's start named under their bars. Bars far above the leash are cut off (a zigzag).
 */
export function WindingChart({
  walk,
  leash,
  chosen,
  t,
  w,
}: {
  walk: WoodsWalk
  leash: number
  chosen: number
  t: FrechetTexts
  w: WoodsTexts
}) {
  const values = START_WINDINGS.map((k) => walk.starts?.[k]?.target ?? NaN)
  const top = Math.max(leash * 1.8, walk.target * 2)
  const y = (v: number) => BASE - (Math.min(v, top) / top) * (BASE - TOP)
  const slot = (RIGHT - LEFT) / START_WINDINGS.length
  const bar = slot * 0.62
  const summary = w.chart.summary(
    START_WINDINGS.map((k, i) => `${w.start.short(k)}: ${t.metres(values[i]!)}`).join(', '),
    walk.bestStart ?? 0,
  )
  return (
    <figure style={{ margin: 0 }}>
      <figcaption>
        <strong>{w.chart.title}</strong>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={woods.chart}
        role="img"
        aria-label={summary}
        data-testid="winding-chart"
      >
        <line x1={LEFT} x2={RIGHT} y1={BASE} y2={BASE} stroke="var(--ink)" strokeWidth={1.5} />
        {START_WINDINGS.map((k, i) => {
          const v = values[i]!
          const x = LEFT + slot * i + (slot - bar) / 2
          const cx = x + bar / 2
          const best = k === walk.bestStart
          const mine = k === chosen
          const cut = v > top
          const h = BASE - y(v)
          return (
            <g key={k} data-testid={best ? 'chart-best' : undefined}>
              <title>{`${w.start.value(k)}: ${t.metres(v)}`}</title>
              {/* Rounded at the top only, anchored at the base line. */}
              <path
                d={`M${x},${BASE} V${BASE - h + 4} q0,-4 4,-4 H${x + bar - 4} q4,0 4,4 V${BASE} Z`}
                fill={best ? 'var(--person)' : 'var(--land-wash, #e9dcbc)'}
                stroke="var(--ink)"
                strokeWidth={mine ? 2.6 : 1.2}
              />
              {/* Cut off far above the leash: a break (two zigzags) through the bar's top. */}
              {cut && (
                <g fill="none" strokeLinejoin="round">
                  <path d={zigzag(x, TOP + 13, bar)} stroke="var(--paper)" strokeWidth={6} />
                  <path d={zigzag(x, TOP + 10, bar)} stroke="var(--ink)" strokeWidth={1.2} />
                  <path d={zigzag(x, TOP + 16, bar)} stroke="var(--ink)" strokeWidth={1.2} />
                </g>
              )}
              {(best || mine) && !cut && (
                <text
                  x={cx}
                  y={y(v) - 5}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily="var(--font-text)"
                  fill="var(--ink)"
                >
                  {t.metres(v)}
                </text>
              )}
              <text
                x={k === 0 ? cx : cx - 5}
                y={BASE + 15}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-text)"
                fill="var(--ink)"
              >
                {Math.abs(k)}
              </text>
              {k !== 0 && <Turn x={cx + 6} y={BASE + 11} clockwise={k > 0} />}
              {[best && w.chart.best, mine && w.chart.yours]
                .filter((label): label is string => !!label)
                .map((label, j) => (
                  <text
                    key={label}
                    x={cx}
                    y={BASE + 31 + 15 * j}
                    textAnchor="middle"
                    fontSize={13}
                    fontFamily="var(--font-text)"
                    fill="var(--ink)"
                  >
                    {label}
                  </text>
                ))}
            </g>
          )
        })}
        <line
          x1={LEFT}
          x2={RIGHT}
          y1={y(leash)}
          y2={y(leash)}
          stroke="var(--warn)"
          strokeWidth={1.6}
          strokeDasharray="5 4"
        />
      </svg>
      <p className={woods.chartLegend}>
        <span className={woods.dashSwatch} /> {w.chart.leash(leash)}
      </p>
    </figure>
  )
}
