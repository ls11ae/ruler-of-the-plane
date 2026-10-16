import { useEffect, useState } from 'react'
import { LEVEL_IDS, mapOf, type RoadsMap } from '../../../core/games/roads/levels'
import type { KingsTaxesLevel } from '../../../core/levels/schema'
import { Button } from '../../components/Button'
import { Overlay } from '../../components/Overlay'
import { Stars } from '../../components/Stars'
import { loadLevel } from '../../levels'
import styles from './Roads.module.css'
import type { RoadsTexts } from './i18n.de'
import { useProgress } from './store'

function Preview({ map }: { map: RoadsMap }) {
  const { minX, minY, maxX, maxY } = map.bounds
  return (
    <svg viewBox={`${minX - 0.5} ${minY - 0.5} ${maxX - minX + 1} ${maxY - minY + 1}`} aria-hidden="true">
      {map.points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.22} fill={i >= map.villages ? 'var(--light)' : 'var(--ink)'} />
      ))}
    </svg>
  )
}

/** The fixed maps with their stars, and the random villages. */
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
    void Promise.all(LEVEL_IDS.map((id) => loadLevel<KingsTaxesLevel>(id))).then(
      (levels) => live && setMaps(levels.map(mapOf)),
    )
    return () => {
      live = false
    }
  }, [])
  return (
    <Overlay title={t.picker.title} onClose={onClose}>
      <div className={styles.picker}>
        <div className={styles.cards}>
          {LEVEL_IDS.map((id, i) => (
            <button
              key={id}
              type="button"
              className={styles.card}
              aria-current={i === level}
              onClick={() => onPick(i)}
            >
              {maps?.[i] && <Preview map={maps[i]} />}
              <span className={styles.cardTitle}>{i + 1}</span>
              <Stars count={stars[id] ?? 0} size={18} />
            </button>
          ))}
        </div>
        <Button variant="dashed" onClick={() => onPick(LEVEL_IDS.length)}>
          {t.picker.random}
        </Button>
      </div>
    </Overlay>
  )
}
