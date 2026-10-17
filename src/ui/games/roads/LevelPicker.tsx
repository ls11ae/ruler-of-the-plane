import { useEffect, useState } from 'react'
import { LEVEL_IDS, mapOf, SETS, type RoadsMap } from '../../../core/games/roads/levels'
import type { KingsTaxesLevel, RoadsBichromaticLevel, RoadsSteinerLevel } from '../../../core/levels/schema'
import { Button } from '../../components/Button'
import { Overlay } from '../../components/Overlay'
import { Stars } from '../../components/Stars'
import { loadLevel } from '../../levels'
import styles from './Roads.module.css'
import type { RoadsTexts } from './i18n.de'
import { useProgress } from './store'

/** The places of a map: villages as dots, castles as squares (not only a colour). */
function Preview({ map }: { map: RoadsMap }) {
  const { minX, minY, maxX, maxY } = map.bounds
  return (
    <svg viewBox={`${minX - 0.5} ${minY - 0.5} ${maxX - minX + 1} ${maxY - minY + 1}`} aria-hidden="true">
      {map.points.map(([x, y], i) =>
        i >= map.villages ? (
          <rect
            key={i}
            x={x - 0.22}
            y={y - 0.22}
            width={0.44}
            height={0.44}
            fill="var(--light)"
            stroke="var(--ink)"
            strokeWidth={0.06}
          />
        ) : (
          <circle key={i} cx={x} cy={y} r={0.22} fill="var(--ink)" />
        ),
      )}
    </svg>
  )
}

/** The fixed maps with their stars, set by set, and the random villages. */
export function LevelPicker({
  t,
  onPick,
  onClose,
}: {
  t: RoadsTexts
  onPick: (level: number) => void
  onClose: () => void
}) {
  const { level, stars } = useProgress()
  const [maps, setMaps] = useState<RoadsMap[] | null>(null)
  useEffect(() => {
    let live = true
    void Promise.all(
      LEVEL_IDS.map((id) => loadLevel<KingsTaxesLevel | RoadsSteinerLevel | RoadsBichromaticLevel>(id)),
    ).then((levels) => live && setMaps(levels.map(mapOf)))
    return () => {
      live = false
    }
  }, [])
  return (
    <Overlay title={t.picker.title} onClose={onClose}>
      <div className={styles.picker}>
        {SETS.map(({ set, ids }) => (
          <section key={set} aria-label={t.sets[set]}>
            <h3 className={styles.setTitle}>{t.sets[set]}</h3>
            <div className={styles.cards}>
              {ids.map((id, i) => {
                const index = LEVEL_IDS.indexOf(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={styles.card}
                    aria-current={index === level}
                    aria-label={`${t.sets[set]}: ${t.picker.map(i + 1)}`}
                    onClick={() => onPick(index)}
                  >
                    {maps?.[index] && <Preview map={maps[index]} />}
                    <span className={styles.cardTitle}>{i + 1}</span>
                    <Stars count={stars[id] ?? 0} size={18} />
                  </button>
                )
              })}
            </div>
          </section>
        ))}
        <Button variant="dashed" onClick={() => onPick(LEVEL_IDS.length)}>
          {t.picker.random}
        </Button>
      </div>
    </Overlay>
  )
}
