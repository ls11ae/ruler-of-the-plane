import type { Delaunay } from 'd3-delaunay'
import type { HeatGrid } from '../../../core/games/voronoi/service'
import { Button } from '../../components/Button'
import { useBoard } from '../../components/boardContext'
import type { VoronoiTexts } from './i18n.de'
import { circumcircles } from './drawing'
import styles from './Voronoi.module.css'

export interface TheoryLayers {
  voronoi: boolean
  delaunay: boolean
  circles: boolean
  heat: boolean
}

/**
 * The heat map: the swing of a new castle at every grid point, from pale yellow (little) to red (much),
 * and a ring around the best spot. Its own colours, so it reads on both players' territories.
 */
export function HeatLayer({ grid }: { grid: HeatGrid }) {
  const board = useBoard()
  let max = 0
  let best = -1
  grid.values.forEach((v, i) => {
    if (v > max) {
      max = v
      best = i
    }
  })
  const s = grid.spacing
  const centre = (i: number) =>
    [grid.x0 + (i % grid.columns) * s, grid.y0 + Math.floor(i / grid.columns) * s] as const
  const rects = []
  for (let i = 0; i < grid.values.length; i++) {
    const v = grid.values[i]!
    if (Number.isNaN(v) || max <= 0) continue
    const f = v / max
    const [x, y] = centre(i)
    rects.push(
      <rect
        key={i}
        x={x - s / 2}
        y={y - s / 2}
        width={s * 1.02}
        height={s * 1.02}
        fill={`hsl(${Math.round(52 - 50 * f)} 95% ${Math.round(62 - 14 * f)}%)`}
        fillOpacity={0.25 + 0.55 * f ** 1.5}
      />,
    )
  }
  return (
    <g data-testid="heat-map" pointerEvents="none">
      {rects}
      {best >= 0 && (
        <circle
          cx={centre(best)[0]}
          cy={centre(best)[1]}
          r={board.pxToBoard(16)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={board.pxToBoard(3)}
        />
      )}
    </g>
  )
}

/** Voronoi diagram, Delaunay triangles and their empty circumcircles over the map. */
export function TheoryLayer({
  delaunay,
  voronoiPath,
  layers,
}: {
  delaunay: Delaunay<Delaunay.Point> | null
  voronoiPath: string
  layers: TheoryLayers
}) {
  const board = useBoard()
  const px = board.pxToBoard(1)
  if (!delaunay) return null
  return (
    <g data-testid="theory-layer" pointerEvents="none">
      {layers.circles &&
        circumcircles(delaunay).map((c, i) => (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={c.r}
              fill="none"
              stroke="#8a3fb8"
              strokeWidth={1.6 * px}
              strokeOpacity={0.7}
            />
            <circle cx={c.x} cy={c.y} r={3 * px} fill="#8a3fb8" />
          </g>
        ))}
      {layers.delaunay && (
        <path
          d={delaunay.render()}
          fill="none"
          stroke="#1d7f5a"
          strokeWidth={2.2 * px}
          strokeDasharray={`${7 * px} ${4 * px}`}
        />
      )}
      {layers.voronoi && <path d={voronoiPath} fill="none" stroke="var(--ink)" strokeWidth={2.6 * px} />}
    </g>
  )
}

/** The theory panel: switches for the layers and what they mean. */
export function TheoryPanel({
  layers,
  setLayers,
  heatFor,
  heatLoading,
  thinkMs,
  t,
  onClose,
}: {
  layers: TheoryLayers
  setLayers: (l: TheoryLayers) => void
  heatFor: string
  heatLoading: boolean
  /** Computing time of the computer's last move, if it has moved. */
  thinkMs: number | null
  t: VoronoiTexts
  onClose: () => void
}) {
  const toggle = (key: keyof TheoryLayers, label: string, swatch: string) => (
    <Button
      small
      selected={layers[key]}
      aria-pressed={layers[key]}
      onClick={() => setLayers({ ...layers, [key]: !layers[key] })}
    >
      <span className={styles.swatch} style={{ background: swatch }} aria-hidden="true" />
      {label}
    </Button>
  )
  return (
    <aside className={styles.theory} aria-label={t.theory.title}>
      <div className={styles.theoryHead}>
        <h2>{t.theory.title}</h2>
        <Button small onClick={onClose} aria-label={t.theory.close}>
          ×
        </Button>
      </div>
      <div className={styles.toggles}>
        {toggle('voronoi', t.theory.voronoi, 'var(--ink)')}
        {toggle('delaunay', t.theory.delaunay, '#1d7f5a')}
        {toggle('circles', t.theory.circles, '#8a3fb8')}
        {toggle('heat', t.theory.heat, 'hsl(20 95% 52%)')}
      </div>
      <p>{t.theory.voronoiText}</p>
      <p>{t.theory.delaunayText}</p>
      <p>
        {t.theory.heatText(heatFor)}
        {layers.heat && heatLoading && <em> {t.theory.heatLoading}</em>}
      </p>
      {thinkMs !== null && <p data-testid="think-time">{t.theory.thinkTime(thinkMs)}</p>}
    </aside>
  )
}
