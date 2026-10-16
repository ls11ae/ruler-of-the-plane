import { useMemo } from 'react'
import { lowerBound, makeLawn, type Lawn } from '../../../core/games/lawn-mowing/mowing'
import { COMPETITION } from '../../../core/games/lawn-mowing/rules'
import type { Vec2 } from '../../../core/geometry/types'
import type { LawnMowingLevel } from '../../../core/levels/schema'
import { Button } from '../../components/Button'
import { useLevel } from '../../levels'
import type { LawnTexts } from './i18n.de'
import styles from './LawnMowing.module.css'
import { TourAnimation } from './TourAnimation'

/** The real competition instance with its example solution, played back. */
function Competition({ t }: { t: LawnTexts }) {
  const level = useLevel<LawnMowingLevel>(COMPETITION)
  const lawn = useMemo(
    () =>
      level.status === 'ready'
        ? makeLawn(level.value.outer, level.value.holes, level.value.cutter, level.value.cutterCenter)
        : null,
    [level],
  )
  if (level.status !== 'ready' || !lawn) return null
  const variant = level.value.variants[0]!
  if (!variant.solution) return null
  return (
    <section>
      <h3>{t.theory.competitionTitle}</h3>
      <p>{t.theory.competition(lawn.cells.count, variant.cutters, variant.solution.maxTourLength)}</p>
      <TourAnimation
        level={level.value}
        lawn={lawn}
        tours={variant.solution.tours}
        label={t.theory.competitionAnimation}
        replay={t.replay}
        durationMs={9000}
      />
    </section>
  )
}

/**
 * The theory panel: the min-max objective, the lower bound from the cutter's width with this lawn's
 * numbers, the solver's tours (or the strip strategy) played back, and a real competition instance.
 */
export function TheoryPanel({
  level,
  lawn,
  cutters,
  tours,
  solver,
  stripLength,
  t,
  onClose,
}: {
  level: LawnMowingLevel
  lawn: Lawn
  cutters: number
  tours: readonly (readonly Vec2[])[]
  /** The solver's longest tour, if its tours are known. */
  solver: number | undefined
  stripLength: number
  t: LawnTexts
  onClose: () => void
}) {
  return (
    <aside className={styles.theory} aria-label={t.theory.title}>
      <div className={styles.theoryHead}>
        <h2>{t.theory.title}</h2>
        <Button small onClick={onClose} aria-label={t.theory.close}>
          ×
        </Button>
      </div>
      <p>{t.theory.objective}</p>
      <p>
        <strong>{t.theory.bound(lawn.cells.count, cutters, lowerBound(lawn, cutters))}</strong>
      </p>
      <p>
        {solver !== undefined ? t.theory.solver(solver) : t.theory.solverPending}{' '}
        {t.theory.strips(stripLength)}
      </p>
      <TourAnimation
        level={level}
        lawn={lawn}
        tours={tours}
        label={t.explanationAnimation}
        replay={t.theory.play}
      />
      <Competition t={t} />
    </aside>
  )
}
