import { useMemo } from 'react'
import {
  cornerValues,
  criticalValues,
  decide,
  tightestPoint,
  type Walk,
} from '../../../core/games/frechet/frechet'
import type { Path } from '../../../core/games/frechet/path'
import { Button } from '../../components/Button'
import styles from './Frechet.module.css'
import { FreeSpaceDiagram } from './FreeSpaceDiagram'
import type { FrechetTexts } from './i18n.de'
import { sliderMax } from './helpers'
import { LeashSlider } from './LeashSlider'

export interface TheoryCourse {
  person: Path
  dog: Path
  shortest: number
  computer: Walk
}

interface TheoryPanelProps {
  course: TheoryCourse
  /** The player's walk so far (null in the sandbox before a walk). */
  player: Walk | null
  eps: number
  setEps: (eps: number) => void
  probe: readonly [number, number] | null
  setProbe: (at: [number, number] | null) => void
  t: FrechetTexts
  onClose: () => void
  onSandbox?: () => void
}

/**
 * The theory panel (beside the park, as in the mockup): the free-space diagram for the leash on the
 * slider, the player's and the computer's walk, the narrowest spot, and the special leash lengths the
 * computer tries.
 */
export function TheoryPanel({
  course,
  player,
  eps,
  setEps,
  probe,
  setProbe,
  t,
  onClose,
  onSandbox,
}: TheoryPanelProps) {
  const { person, dog, shortest, computer } = course
  const P = person.points
  const Q = dog.points
  const ticks = useMemo(() => cornerValues(P, Q), [P, Q])
  const candidates = useMemo(() => criticalValues(P, Q).length, [P, Q])
  const narrowest = useMemo(() => tightestPoint(person, dog, computer).at, [person, dog, computer])
  const ok = useMemo(() => decide(P, Q, eps), [P, Q, eps])
  const max = sliderMax(shortest, eps)
  const stops = [...ticks, shortest].sort((a, b) => a - b)
  const jump = (dir: -1 | 1) => {
    const next =
      dir > 0 ? stops.find((v) => v > eps + 1e-6) : [...stops].reverse().find((v) => v < eps - 1e-6)
    if (next !== undefined) setEps(Math.round(next * 1000) / 1000)
  }
  return (
    <aside className={styles.theory} aria-label={t.theory.title}>
      <div className={styles.theoryHead}>
        <h2>{t.theory.title}</h2>
        <Button small onClick={onClose} aria-label={t.theory.close}>
          ×
        </Button>
      </div>
      <p>{t.theory.intro}</p>
      <FreeSpaceDiagram
        person={person}
        dog={dog}
        eps={eps}
        walks={[
          { walk: computer, kind: 'computer' },
          ...(player && player.length > 1 ? [{ walk: player, kind: 'player' as const }] : []),
        ]}
        marker={narrowest}
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
        <li>
          <span className={styles.dotSwatch} />
          {t.theory.narrowest}
        </li>
      </ul>
      <div className={styles.sliderRow}>
        <Button small onClick={() => jump(-1)} aria-label={t.theory.previous}>
          <Chevron left />
        </Button>
        <LeashSlider
          label={t.theory.slider(eps)}
          value={eps}
          min={0}
          max={max}
          onChange={setEps}
          ticks={ticks}
          mark={shortest}
        />
        <Button small onClick={() => jump(1)} aria-label={t.theory.next}>
          <Chevron />
        </Button>
      </div>
      <p data-testid="theory-verdict">{ok ? t.theory.walkExists : t.theory.noWalk}</p>
      <p>
        <strong>{t.theory.shortest(shortest)}</strong>
      </p>
      <p>{t.theory.critical(candidates, Math.ceil(Math.log2(Math.max(2, candidates))))}</p>
      <p className={styles.muted}>{t.theory.probe}</p>
      {onSandbox && (
        <Button small variant="dashed" onClick={onSandbox}>
          {t.theory.sandbox}
        </Button>
      )}
    </aside>
  )
}

/** ‹ and › drawn in SVG (Patrick Hand has no arrow glyphs). */
export function Chevron({ left = false }: { left?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width={16} height={16} aria-hidden="true">
      <path
        d={left ? 'M13 4 7 10l6 6' : 'M7 4l6 6-6 6'}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
