import { useState } from 'react'
import { Button } from '../components/Button'
import { Overlay } from '../components/Overlay'
import { GAME_IDS, isImplemented } from '../games/registry'
import { useT } from '../i18n'
import { useBooth } from './booth'
import { KeyTest } from './KeyTest'
import { navigate } from './router'
import { useSettings, type Difficulty } from './settings'
import styles from './StaffMenu.module.css'
import { useUi } from './ui'

/** The staff PIN from the build (`VITE_STAFF_PIN`); empty means no PIN. Public in the bundle by design. */
const STAFF_PIN = import.meta.env.VITE_STAFF_PIN?.trim() ?? ''

let unlockedThisSession = false

function PinForm({ onUnlock }: { onUnlock: () => void }) {
  const t = useT()
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)
  return (
    <form
      className={styles.pin}
      onSubmit={(e) => {
        e.preventDefault()
        if (pin === STAFF_PIN) onUnlock()
        else {
          setWrong(true)
          setPin('')
        }
      }}
    >
      <label>
        {t.staff.pin}{' '}
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          data-autofocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setWrong(false)
          }}
        />
      </label>
      <Button type="submit">{t.staff.unlock}</Button>
      {wrong && (
        <span className={styles.error} role="alert">
          {t.staff.wrongPin}
        </span>
      )}
    </form>
  )
}

function ConfirmButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const t = useT()
  const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle')
  return (
    <Button
      small
      variant={step === 'confirm' ? 'accent' : 'solid'}
      onClick={() => {
        if (step === 'confirm') {
          onConfirm()
          setStep('done')
        } else setStep('confirm')
      }}
    >
      {step === 'idle'
        ? label
        : step === 'confirm'
          ? `${label}: ${t.staff.confirm}`
          : `${label}: ${t.staff.done}`}
    </Button>
  )
}

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

/**
 * Hidden staff menu (long press on the compass, or Ctrl+Shift+S): games on/off, difficulty, kiosk mode,
 * clearing the booth data, the key test.
 */
export function StaffMenu() {
  const t = useT()
  const close = useUi((s) => s.closeStaff)
  const showAttract = useUi((s) => s.showAttract)
  const settings = useSettings()
  const resetBoards = useBooth((s) => s.resetBoards)
  const resetVersus = useBooth((s) => s.resetVersus)
  const [unlocked, setUnlocked] = useState(unlockedThisSession || STAFF_PIN === '')
  const [view, setView] = useState<'menu' | 'keys'>('menu')

  if (!unlocked) {
    return (
      <Overlay title={t.staff.title} onClose={close}>
        <PinForm
          onUnlock={() => {
            unlockedThisSession = true
            setUnlocked(true)
          }}
        />
      </Overlay>
    )
  }

  if (view === 'keys') {
    return (
      <Overlay
        title={t.keyTest.title}
        onClose={close}
        actions={
          <Button data-autofocus onClick={() => setView('menu')}>
            {t.staff.title}
          </Button>
        }
      >
        <KeyTest />
      </Overlay>
    )
  }

  return (
    <Overlay
      title={t.staff.title}
      onClose={close}
      className={styles.menu}
      actions={
        <Button data-autofocus onClick={close}>
          {t.staff.close}
        </Button>
      }
    >
      {STAFF_PIN === '' && <p className={styles.muted}>{t.staff.noPin}</p>}
      <div className={styles.sections}>
        <section className={styles.section}>
          <h3>{t.staff.games}</h3>
          {GAME_IDS.map((id) => {
            const built = isImplemented(id)
            const on = !settings.disabledGames.includes(id)
            return (
              <div key={id} className={styles.row}>
                <span>
                  {t.places[id].name}
                  {!built && <span className={styles.muted}> ({t.staff.notBuilt})</span>}
                </span>
                <Button
                  small
                  selected={on}
                  aria-pressed={on}
                  onClick={() => settings.setGameEnabled(id, !on)}
                >
                  {on ? t.staff.on : t.staff.off}
                </Button>
              </div>
            )
          })}
        </section>
        <section className={styles.section}>
          <h3>{t.staff.difficulty}</h3>
          <div className={styles.group}>
            {DIFFICULTIES.map((d) => (
              <Button
                key={d}
                small
                selected={settings.difficulty === d}
                aria-pressed={settings.difficulty === d}
                onClick={() => settings.setDifficulty(d)}
              >
                {t.staff.difficulties[d]}
              </Button>
            ))}
          </div>
          <h3>{t.staff.kiosk}</h3>
          <div className={styles.row}>
            <span className={styles.muted}>{t.staff.kioskHint}</span>
            <Button
              small
              selected={settings.kiosk}
              aria-pressed={settings.kiosk}
              onClick={() => settings.setKiosk(!settings.kiosk)}
            >
              {settings.kiosk ? t.staff.on : t.staff.off}
            </Button>
          </div>
        </section>
        <section className={styles.section}>
          <h3>{t.staff.data}</h3>
          <div className={styles.group}>
            <ConfirmButton label={t.staff.resetLeaderboards} onConfirm={resetBoards} />
            <ConfirmButton label={t.staff.resetVersus} onConfirm={resetVersus} />
          </div>
          <h3>{t.staff.keyTest}</h3>
          <div className={styles.group}>
            <Button small onClick={() => setView('keys')}>
              {t.staff.keyTest}
            </Button>
            <Button
              small
              onClick={() => {
                close()
                navigate({ name: 'start' })
                showAttract()
              }}
            >
              {t.staff.attractNow}
            </Button>
          </div>
        </section>
      </div>
      <p className={styles.footer}>{t.staff.build(`${__APP_VERSION__} (${__BUILD_TIME__})`)}</p>
    </Overlay>
  )
}
