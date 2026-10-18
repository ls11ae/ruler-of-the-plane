import type { ArtGalleryLevel } from '../../../core/levels/schema'
import { levelId, TIER_LEVELS, type LevelName } from '../../../core/games/art-gallery/rules'
import { TIERS } from '../../../core/tiers'
import { Overlay } from '../../components/Overlay'
import { Stars } from '../../components/Stars'
import { useT } from '../../i18n'
import { useLevel } from '../../levels'
import styles from './ArtGallery.module.css'
import { floorPath } from './paths'
import type { ArtGalleryTexts } from './i18n.de'
import { useProgress } from './store'

function Thumbnail({ level }: { level: ArtGalleryLevel }) {
  const { minX, minY, maxX, maxY } = level.bounds
  const pad = 0.3
  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`}
      aria-hidden="true"
    >
      <path
        d={floorPath(level)}
        fill="var(--paper)"
        fillRule="evenodd"
        stroke="var(--ink)"
        strokeWidth={0.18}
      />
    </svg>
  )
}

function Card({
  name,
  index,
  t,
  onPick,
}: {
  name: LevelName
  index: number
  t: ArtGalleryTexts
  onPick: () => void
}) {
  const level = useLevel<ArtGalleryLevel>(levelId(name))
  const best = useProgress((s) => s.best[name])
  const current = useProgress((s) => s.level === name)
  return (
    <button type="button" className={styles.card} aria-current={current} onClick={onPick}>
      {level.status === 'ready' ? <Thumbnail level={level.value} /> : <svg aria-hidden="true" />}
      <span className={styles.cardTitle}>{t.picker.card(index + 1)}</span>
      <span>{level.status === 'ready' ? t.picker.torches(level.value.torches) : ' '}</span>
      <Stars count={best?.stars ?? 0} size={20} />
    </button>
  )
}

/** All dungeons with their best result on this device, in the three tiers ("Leicht", "Mittel", "Schwer"). */
export function LevelPicker({
  t,
  onPick,
  onClose,
}: {
  t: ArtGalleryTexts
  onPick: (n: LevelName) => void
  onClose: () => void
}) {
  const shell = useT()
  return (
    <Overlay title={t.picker.title} onClose={onClose}>
      <div className={styles.picker}>
        {TIERS.map((tier) => (
          <section key={tier} aria-label={shell.tiers.names[tier]}>
            <h3>
              {shell.tiers.names[tier]}
              {tier === 'hard' && ` · ${t.picker.expert}`}
            </h3>
            <div className={styles.cards}>
              {TIER_LEVELS[tier].map((name, i) => (
                <Card key={name} name={name} index={i} t={t} onPick={() => onPick(name)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Overlay>
  )
}
