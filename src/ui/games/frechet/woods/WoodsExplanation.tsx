import { useMemo, useState } from 'react'
import type { Walk } from '../../../../core/games/frechet/frechet'
import type { WoodsCourse } from '../../../../core/games/frechet/woods/rules'
import { Button } from '../../../components/Button'
import { useAnimationFrame } from '../../../input/hooks'
import styles from '../Frechet.module.css'
import { FreeSpaceDiagram } from '../FreeSpaceDiagram'
import type { FrechetTexts } from '../i18n.de'
import { woodsField } from './field'
import type { WoodsTexts } from './i18n.de'

const DRAW_MS = 3000

/**
 * "Was steckt dahinter?" in the woods (proposed): the diagram of positions for the walk's leash,
 * measured around the trees and tinted where the leash touches one; the player's walk is drawn from
 * the bottom left to the top right beside the computer's walk.
 */
export function WoodsExplanation({
  course,
  player,
  t,
  w,
}: {
  course: WoodsCourse
  player: Walk
  t: FrechetTexts
  w: WoodsTexts
}) {
  const field = useMemo(() => woodsField(course), [course])
  const [start, setStart] = useState(() => performance.now())
  const [progress, setProgress] = useState(0)
  useAnimationFrame((now) => setProgress(Math.min(1, (now - start) / DRAW_MS)), progress < 1)
  return (
    <div className={styles.explainDiagram}>
      <FreeSpaceDiagram
        person={course.person}
        dog={course.dog}
        eps={course.leash}
        field={field}
        walks={[
          { walk: course.computer, kind: 'computer' },
          { walk: player, kind: 'player', progress },
        ]}
        label={w.explanationAnimation}
        axes={{ person: t.person, dog: t.dog }}
      />
      <Button
        small
        onClick={() => {
          setStart(performance.now())
          setProgress(0)
        }}
      >
        {t.replay}
      </Button>
    </div>
  )
}
