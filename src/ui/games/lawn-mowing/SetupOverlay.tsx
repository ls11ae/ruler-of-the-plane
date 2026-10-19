import { useMemo, useState } from 'react'
import { makeLawn } from '../../../core/games/lawn-mowing/mowing'
import { LAWNS, TIER_LAWNS, type LawnId } from '../../../core/games/lawn-mowing/rules'
import { TIERS } from '../../../core/tiers'
import type { LawnMowingLevel } from '../../../core/levels/schema'
import { Button } from '../../components/Button'
import { Overlay } from '../../components/Overlay'
import { Stars } from '../../components/Stars'
import { useT } from '../../i18n'
import { useLevel } from '../../levels'
import { boardBounds, ringsPath } from './geometry'
import { MORTAR } from './LawnArt'
import type { LawnTexts } from './i18n.de'
import styles from './LawnMowing.module.css'
import { starsKey, usePrefs, type Setup } from './store'

function LawnCard({
  id,
  index,
  selected,
  stars,
  t,
  onPick,
}: {
  id: LawnId
  index: number
  selected: boolean
  /** Best stars on this lawn with the chosen number of mowers. */
  stars: number
  t: LawnTexts
  onPick: () => void
}) {
  const level = useLevel<LawnMowingLevel>(id)
  const cells = useMemo(
    () =>
      level.status === 'ready'
        ? makeLawn(level.value.outer, level.value.holes, level.value.cutter, level.value.cutterCenter).cells
            .count
        : 0,
    [level],
  )
  const name = id.split('/')[1]!
  const b = level.status === 'ready' ? boardBounds(level.value, 0.5) : null
  return (
    <button type="button" className={styles.lawnCard} aria-pressed={selected} onClick={onPick}>
      <svg
        viewBox={b ? `${b.minX} ${b.minY} ${b.maxX - b.minX} ${b.maxY - b.minY}` : '0 0 1 1'}
        aria-hidden="true"
      >
        {level.status === 'ready' && (
          <>
            {/* The holes are stone slabs: too small here for single slabs, so the stone's colour. */}
            <path d={ringsPath(level.value.holes)} fill={MORTAR} />
            <path
              d={ringsPath([level.value.outer, ...level.value.holes])}
              fill="#8fca6a"
              fillRule="evenodd"
              stroke="var(--ink)"
              strokeWidth={0.35}
            />
          </>
        )}
      </svg>
      <span className={styles.lawnName}>{t.lawns[name]}</span>
      <span className={styles.lawnInfo}>
        {t.lawnCard(index + 1)}
        {cells ? ` · ${t.cells(cells)}` : ''}
      </span>
      <Stars count={stars} size={16} />
    </button>
  )
}

/** "Neues Spiel": the lawn, in the three tiers, and one or two cutters (phones: one). */
export function SetupOverlay({
  initial,
  phone,
  t,
  onStart,
  onClose,
}: {
  initial: Setup
  phone: boolean
  t: LawnTexts
  onStart: (setup: Setup) => void
  onClose?: () => void
}) {
  const shell = useT()
  const best = usePrefs((s) => s.stars)
  const [setup, setSetup] = useState<Setup>(phone ? { ...initial, cutters: 1 } : initial)
  return (
    <Overlay
      title={t.setup.title}
      onClose={onClose}
      actions={
        <Button variant="accent" data-autofocus onClick={() => onStart(setup)}>
          {t.setup.start}
        </Button>
      }
    >
      <div className={styles.setup}>
        <section>
          <h3>{t.setup.lawn}</h3>
          <div className={styles.lawnTiers}>
            {TIERS.map((tier) => (
              <section key={tier} aria-label={shell.tiers.names[tier]}>
                <h4>{shell.tiers.names[tier]}</h4>
                <div className={styles.lawns}>
                  {TIER_LAWNS[tier].map((id) => (
                    <LawnCard
                      key={id}
                      id={id}
                      index={LAWNS.indexOf(id)}
                      selected={setup.lawn === id}
                      stars={best[starsKey(id, setup.cutters)] ?? 0}
                      t={t}
                      onPick={() => setSetup({ ...setup, lawn: id })}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
        <section>
          <h3>{t.setup.cutters}</h3>
          {phone ? (
            <p>{t.setup.phoneOne}</p>
          ) : (
            <div className={styles.options}>
              {([1, 2] as const).map((k) => (
                <Button
                  key={k}
                  small
                  selected={setup.cutters === k}
                  aria-pressed={setup.cutters === k}
                  onClick={() => setSetup({ ...setup, cutters: k })}
                >
                  {k === 1 ? t.setup.one : t.setup.two}
                </Button>
              ))}
            </div>
          )}
        </section>
      </div>
    </Overlay>
  )
}
