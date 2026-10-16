import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Keycap } from '../components/Keycap'
import { useT } from '../i18n'
import { useHeldKeys, useKeyListener } from '../input/hooks'
import { keyboard } from '../input/keyboard'
import styles from './KeyTest.module.css'

/** Laptop keyboard rows by `KeyboardEvent.code` (labels follow the physical layout where the browser knows it). */
const ROWS: string[][] = [
  ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'],
  ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'ShiftRight'],
  ['ControlLeft', 'AltLeft', 'Space', 'AltRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'],
]

/** Key pairs the two-player games need at the same time ("Gassi gehen": A + L; "Rasenmähen": WASD + arrows). */
const GAME_PAIRS: [string, string][] = [
  ['KeyA', 'KeyL'],
  ['KeyW', 'ArrowUp'],
  ['KeyS', 'ArrowDown'],
  ['KeyA', 'ArrowLeft'],
  ['KeyD', 'ArrowRight'],
  ['KeyW', 'ArrowDown'],
  ['KeyS', 'ArrowUp'],
  ['KeyA', 'ArrowRight'],
  ['KeyD', 'ArrowLeft'],
]

const pairKey = (pair: [string, string]) => pair.join('+')

/** Labels of the physical keys in the current keyboard layout (Chrome: `navigator.keyboard`). */
function useLayoutLabels(): Map<string, string> {
  const [labels, setLabels] = useState(new Map<string, string>())
  useEffect(() => {
    const kb = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } })
      .keyboard
    kb?.getLayoutMap?.().then(
      (map) => setLabels(new Map([...map].map(([code, key]) => [code, key.toUpperCase()]))),
      () => {},
    )
  }, [])
  return labels
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" className={styles.check} aria-hidden="true">
      <path d="M3 11l5 5 9-12" fill="none" stroke="var(--owner)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Key test for the booth laptops: every held key lights up, the most keys seen at once, and which game
 * key pairs the keyboard reports together (cheap laptop keyboards often drop the third or fourth key).
 */
export function KeyTest() {
  const t = useT()
  const held = useHeldKeys()
  const labels = useLayoutLabels()
  const [max, setMax] = useState(0)
  const [seen, setSeen] = useState(new Set<string>())

  useKeyListener(() => {
    const now = keyboard.state.held()
    setMax((m) => Math.max(m, now.length))
    const both = GAME_PAIRS.filter(([a, b]) => now.includes(a) && now.includes(b)).map(pairKey)
    if (both.length) setSeen((s) => (both.every((p) => s.has(p)) ? s : new Set([...s, ...both])))
  })

  return (
    <div className={styles.test}>
      <p>{t.keyTest.hint}</p>
      <div className={styles.keyboard} aria-hidden="true">
        {ROWS.map((row, i) => (
          <div key={i} className={styles.row}>
            {row.map((code) => (
              <span key={code} className={code === 'Space' ? styles.space : undefined}>
                <Keycap code={code} label={labels.get(code)} pressed={held.includes(code)} />
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.facts}>
        <span>
          {t.keyTest.held}:{' '}
          <span className={styles.held}>{held.length ? held.join(' + ') : t.keyTest.none}</span>
        </span>
        <span>
          {t.keyTest.max}: <strong>{max}</strong>
        </span>
      </div>
      <div>
        {t.keyTest.pairs}:
        <ul className={styles.pairs}>
          {GAME_PAIRS.map((pair) => (
            <li key={pairKey(pair)} className={seen.has(pairKey(pair)) ? styles.seen : undefined}>
              <Keycap code={pair[0]} label={labels.get(pair[0])} pressed={held.includes(pair[0])} />+
              <Keycap code={pair[1]} pressed={held.includes(pair[1])} />
              {seen.has(pairKey(pair)) && <Check />}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Button
          small
          onClick={() => {
            setMax(0)
            setSeen(new Set())
          }}
        >
          {t.keyTest.reset}
        </Button>
      </div>
    </div>
  )
}
