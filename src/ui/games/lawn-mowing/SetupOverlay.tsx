import { useMemo, useState } from 'react'
import { makeLawn } from '../../../core/games/lawn-mowing/mowing'
import { LAWNS, type LawnId } from '../../../core/games/lawn-mowing/rules'
import type { LawnMowingLevel } from '../../../core/levels/schema'
import { Button } from '../../components/Button'
import { Overlay } from '../../components/Overlay'
import { useLevel } from '../../levels'
import { boardBounds, ringsPath } from './geometry'
import type { LawnTexts } from './i18n.de'
import styles from './LawnMowing.module.css'
import type { Setup } from './store'

function LawnCard({
  id,
  index,
  selected,
  t,
  onPick,
}: {
  id: LawnId
  index: number
  selected: boolean
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
          <path
            d={ringsPath([level.value.outer, ...level.value.holes])}
            fill="#8fca6a"
            fillRule="evenodd"
            stroke="var(--ink)"
            strokeWidth={0.35}
          />
        )}
      </svg>
      <span className={styles.lawnName}>{t.lawns[name]}</span>
      <span className={styles.lawnInfo}>
        {t.lawnCard(index + 1)}
        {cells ? ` · ${t.cells(cells)}` : ''}
      </span>
    </button>
  )
}

/** "Neues Spiel": the lawn and one or two cutters (phones: one). */
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
          <div className={styles.lawns}>
            {LAWNS.map((id, i) => (
              <LawnCard
                key={id}
                id={id}
                index={i}
                selected={setup.lawn === id}
                t={t}
                onPick={() => setSetup({ ...setup, lawn: id })}
              />
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
