import type { ReactNode } from 'react'
import { useT } from '../i18n'
import { Button } from './Button'
import { Keycap } from './Keycap'
import { Overlay } from './Overlay'
import styles from './Result.module.css'

export interface KeyHint {
  /** Key codes shown as keycaps, e.g. `['KeyW', 'KeyA', 'KeyS', 'KeyD']`. */
  codes: string[]
  label: ReactNode
}

interface HowToOverlayProps {
  /** Two or three short sentences. */
  children: ReactNode
  /** The rules as a short animation (SVG), shown above the text. */
  animation?: ReactNode
  keys?: KeyHint[]
  onClose: () => void
}

/** "So geht's": the rules in two or three sentences, an animation and the keys; closes with "Los geht's!". */
export function HowToOverlay({ children, animation, keys, onClose }: HowToOverlayProps) {
  const t = useT()
  return (
    <Overlay
      title={t.game.howTo}
      onClose={onClose}
      actions={
        <Button variant="accent" data-autofocus onClick={onClose}>
          {t.game.letsGo}
        </Button>
      }
    >
      <div className={styles.howTo}>
        {animation && <div className={styles.animation}>{animation}</div>}
        <div className={styles.text}>{children}</div>
        {keys && keys.length > 0 && (
          <ul className={styles.keys}>
            {keys.map((k, i) => (
              <li key={i}>
                <span className={styles.caps}>
                  {k.codes.map((c) => (
                    <Keycap key={c} code={c} />
                  ))}
                </span>
                <span>{k.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Overlay>
  )
}
