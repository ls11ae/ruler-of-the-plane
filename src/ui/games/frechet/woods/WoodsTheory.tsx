import { useMemo, useState } from 'react'
import { decide, type Walk } from '../../../../core/games/frechet/frechet'
import {
  tightestInWoods,
  walkExistsInWoods,
  type WoodsCourse,
} from '../../../../core/games/frechet/woods/rules'
import { Button } from '../../../components/Button'
import styles from '../Frechet.module.css'
import { FreeSpaceDiagram } from '../FreeSpaceDiagram'
import { sliderMax } from '../helpers'
import type { FrechetTexts } from '../i18n.de'
import { LeashSlider } from '../LeashSlider'
import type { WoodsWalk } from '../../../../core/games/frechet/woods/levels'
import { woodsField } from './field'
import { WindingChart } from './WindingChart'
import type { WoodsTexts } from './i18n.de'
import woods from './Woods.module.css'

interface WoodsTheoryProps {
  walk: WoodsWalk
  course: WoodsCourse
  /** The player's walk so far. */
  player: Walk
  eps: number
  setEps: (eps: number) => void
  probe: readonly [number, number] | null
  setProbe: (at: [number, number] | null) => void
  t: FrechetTexts
  w: WoodsTexts
  onClose: () => void
}

/**
 * The theory panel in the woods (proposed): the diagram of positions as in the park, but light where
 * the leash, measured around the trees, is long enough, and tinted where it touches a tree. A switch
 * shows the same paths without trees for comparison.
 */
export function WoodsTheory({
  walk,
  course,
  player,
  eps,
  setEps,
  probe,
  setProbe,
  t,
  w,
  onClose,
}: WoodsTheoryProps) {
  const [trees, setTrees] = useState(true)
  const field = useMemo(() => woodsField(course), [course])
  const narrowest = useMemo(() => tightestInWoods(course, course.computer).at, [course])
  const ok = useMemo(
    () => (trees ? walkExistsInWoods(course, eps) : decide(course.person.points, course.dog.points, eps)),
    [course, eps, trees],
  )
  const max = sliderMax(course.shortest, course.leash)
  return (
    <aside className={styles.theory} aria-label={t.theory.title}>
      <div className={styles.theoryHead}>
        <h2>{t.theory.title}</h2>
        <Button small onClick={onClose} aria-label={t.theory.close}>
          ×
        </Button>
      </div>
      <p>{w.theory.intro}</p>
      <div className={woods.switch} role="group" aria-label={w.theory.treesLabel}>
        <Button small selected={trees} aria-pressed={trees} onClick={() => setTrees(true)}>
          {w.theory.withTrees}
        </Button>
        <Button small selected={!trees} aria-pressed={!trees} onClick={() => setTrees(false)}>
          {w.theory.withoutTrees}
        </Button>
      </div>
      <FreeSpaceDiagram
        person={course.person}
        dog={course.dog}
        eps={eps}
        field={trees ? field : undefined}
        walks={[
          { walk: course.computer, kind: 'computer' },
          ...(player.length > 1 ? [{ walk: player, kind: 'player' as const }] : []),
        ]}
        marker={trees ? narrowest : null}
        probe={probe}
        onProbe={setProbe}
        label={t.theory.diagram}
        axes={{ person: t.person, dog: t.dog }}
      />
      <ul className={styles.legend}>
        <li>
          <span className={styles.swatch} style={{ borderTopColor: 'var(--person)' }} />
          {t.theory.yours}
        </li>
        <li>
          <span className={styles.swatch} style={{ borderTopStyle: 'dashed' }} />
          {t.theory.computer}
        </li>
        {trees && (
          <>
            <li>
              <span className={styles.dotSwatch} />
              {t.theory.narrowest}
            </li>
            <li>
              <span className={woods.tintSwatch} />
              {w.theory.wrapped}
            </li>
          </>
        )}
      </ul>
      <LeashSlider
        label={t.theory.slider(eps)}
        value={eps}
        min={0}
        max={max}
        onChange={setEps}
        mark={trees ? course.shortest : course.plain}
      />
      <p data-testid="theory-verdict">{ok ? t.theory.walkExists : t.theory.noWalk}</p>
      <p>
        <strong>{w.theory.shortest(course.shortest)}</strong> {w.theory.plain(course.plain)}
      </p>
      {walk.freeStart && (
        <>
          <WindingChart walk={walk} leash={course.leash} chosen={course.winding} t={t} w={w} />
          <p>{w.chart.text}</p>
        </>
      )}
      <p>{w.theory.method}</p>
      <p className={styles.muted}>{t.theory.probe}</p>
    </aside>
  )
}
