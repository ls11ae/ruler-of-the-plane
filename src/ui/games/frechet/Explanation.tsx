import { useState } from 'react'
import type { Walk } from '../../../core/games/frechet/frechet'
import type { Course } from '../../../core/games/frechet/rules'
import { Button } from '../../components/Button'
import { useAnimationFrame } from '../../input/hooks'
import styles from './Frechet.module.css'
import { FreeSpaceDiagram } from './FreeSpaceDiagram'
import type { FrechetTexts } from './i18n.de'

const DRAW_MS = 3000

/**
 * "Was steckt dahinter?": the diagram of all positions for the walk's leash; the player's walk is
 * drawn in green from the bottom left to the top right, beside the computer's walk (dashed).
 */
export function ExplanationDiagram({
  course,
  player,
  eps = course.leash,
  t,
}: {
  course: Course
  /** The player's walk, drawn bit by bit; without one only the computer's walk is shown. */
  player: Walk | null
  eps?: number
  t: FrechetTexts
}) {
  const [start, setStart] = useState(() => performance.now())
  const [progress, setProgress] = useState(0)
  useAnimationFrame(
    (now) => setProgress(Math.min(1, (now - start) / DRAW_MS)),
    player !== null && progress < 1,
  )
  return (
    <div className={styles.explainDiagram}>
      <FreeSpaceDiagram
        person={course.person}
        dog={course.dog}
        eps={eps}
        walks={[
          { walk: course.computer, kind: 'computer' },
          ...(player ? [{ walk: player, kind: 'player' as const, progress }] : []),
        ]}
        label={t.explanationAnimation}
        axes={{ person: t.person, dog: t.dog }}
      />
      {player && (
        <Button
          small
          onClick={() => {
            setStart(performance.now())
            setProgress(0)
          }}
        >
          {t.replay}
        </Button>
      )}
    </div>
  )
}
