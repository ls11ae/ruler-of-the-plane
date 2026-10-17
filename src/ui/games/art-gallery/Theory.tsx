import { useMemo } from 'react'
import { cornerCount, guaranteedTorches, orthogonalTorches } from '../../../core/games/art-gallery/dungeon'
import { fisk, triangulate } from '../../../core/games/art-gallery/triangulation'
import type { Vec2 } from '../../../core/geometry/types'
import type { ArtGalleryLevel } from '../../../core/levels/schema'
import { useBoard } from '../../components/boardContext'
import { Button } from '../../components/Button'
import styles from './ArtGallery.module.css'
import { CornerMark } from './Explanation'
import { diagonals, FISK_COLOURS } from './fiskDrawing'
import type { ArtGalleryTexts } from './i18n.de'
import { ringPath } from './paths'

export interface TheoryLayers {
  triangles: boolean
  visibility: boolean
  colouring: boolean
}

/** Outline colours for the torches' visibility polygons: none of Fisk's red, green and blue. */
const HUES = ['#9b4dca', '#c98a00', '#d6407a', '#1f8a8a', '#8b5a2b', '#5a5ad6']

/** Theory drawn on the board: the triangulation, each torch's visibility polygon, Fisk's colouring. */
export function TheoryLayer({
  level,
  layers,
  visibility,
}: {
  level: ArtGalleryLevel
  layers: TheoryLayers
  visibility: readonly (readonly Vec2[])[]
}) {
  const board = useBoard()
  const t = useMemo(() => triangulate(level), [level])
  const proof = useMemo(() => (level.holes.length === 0 ? fisk(level) : null), [level])
  const lines = useMemo(() => diagonals(level, t.triangles, t.points), [level, t])
  const px = board.pxToBoard(1)
  return (
    <g pointerEvents="none" data-testid="theory-layer">
      {layers.triangles &&
        lines.map(([a, b], i) => (
          <line
            key={i}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke="var(--ink)"
            strokeOpacity={0.6}
            strokeWidth={1.5 * px}
            strokeDasharray={`${6 * px} ${4 * px}`}
          />
        ))}
      {layers.visibility &&
        visibility.map((poly, i) => (
          <path
            key={i}
            d={ringPath(poly)}
            fill="none"
            stroke={HUES[i % HUES.length]}
            strokeWidth={3 * px}
            strokeLinejoin="round"
          />
        ))}
      {layers.colouring && proof && (
        <>
          {proof.guards.map((g) => (
            <circle
              key={`g${g}`}
              cx={t.points[g]![0]}
              cy={t.points[g]![1]}
              r={15 * px}
              fill="var(--light)"
              fillOpacity={0.6}
              stroke="var(--ink)"
              strokeWidth={2 * px}
            />
          ))}
          {proof.triangulation.points.map((p, i) => (
            <CornerMark key={i} at={p} colour={proof.colours[i]!} size={6 * px} />
          ))}
        </>
      )}
    </g>
  )
}

/** The theory panel: the guarantee for this dungeon, NP-hardness, and switches for the board layers. */
export function TheoryPanel({
  level,
  torches,
  layers,
  setLayers,
  t,
  onClose,
}: {
  level: ArtGalleryLevel
  torches: number
  layers: TheoryLayers
  setLayers: (l: TheoryLayers) => void
  t: ArtGalleryTexts
  onClose: () => void
}) {
  const n = cornerCount(level)
  const h = level.holes.length
  const bound = guaranteedTorches(level)
  const quarter = orthogonalTorches(level)
  const toggle = (key: keyof TheoryLayers, label: string) => (
    <Button
      small
      selected={layers[key]}
      aria-pressed={layers[key]}
      onClick={() => setLayers({ ...layers, [key]: !layers[key] })}
    >
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
      <p>
        <strong>
          {quarter !== null
            ? t.theory.boundOrthogonal(n, quarter, bound)
            : h === 0
              ? t.theory.boundNoHoles(n, bound)
              : t.theory.boundHoles(n, h, bound)}
        </strong>
      </p>
      {quarter !== null && <p>{t.theory.orthogonalText}</p>}
      <p>
        {t.theory.level(level.torches)} {t.theory.yours(torches)}
      </p>
      <p>{t.theory.np}</p>
      <div className={styles.toggles}>
        {toggle('triangles', t.theory.triangles)}
        {toggle('visibility', t.theory.visibility)}
        {h === 0 && toggle('colouring', t.theory.colouring)}
      </div>
      <p>{t.theory.visibilityText}</p>
      {h === 0 ? (
        <>
          <p>{t.theory.fiskText}</p>
          <ul className={styles.legend}>
            {FISK_COLOURS.map((_, c) => (
              <li key={c}>
                <svg viewBox="-10 -10 20 20" width={18} height={18} aria-hidden="true">
                  <CornerMark at={[0, 0]} colour={c} size={6} />
                </svg>
                {t.theory.colours[c]}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>{t.theory.fiskHoles}</p>
      )}
    </aside>
  )
}
