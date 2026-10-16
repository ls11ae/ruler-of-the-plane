import { useState } from 'react'
import { WALK_IDS, WALKS, walkById, type WalkLevel } from '../../../core/games/frechet/levels'
import { useLocalized } from '../../i18n'
import { GuessScreen } from './GuessScreen'
import { de } from './i18n.de'
import { en } from './i18n.en'
import { SandboxScreen } from './SandboxScreen'
import { useProgress } from './store'
import { WalkPicker, type Mode } from './WalkPicker'
import { WalkScreen } from './WalkScreen'

/**
 * "Gassi gehen": a person and a dog walk to the castle on their own paths, both only forwards; the
 * leash must not get too taut (Fréchet distance). Modes: the walks, "Schätz die Leine" (guess the
 * shortest leash), and a sandbox for drawing one's own paths.
 */
export default function FrechetGame() {
  const t = useLocalized({ de, en })
  const walk = useProgress((s) => s.walk)
  const setWalk = useProgress((s) => s.setWalk)
  const [mode, setMode] = useState<Mode>('walk')
  const [own, setOwn] = useState<WalkLevel | null>(null)
  const [picker, setPicker] = useState(false)
  const index = WALK_IDS.indexOf(walk)
  const next = WALK_IDS[index + 1]
  const level = walkById(walk)
  const openSandbox = () => {
    setOwn(null)
    setMode('sandbox')
  }

  let screen
  if (mode === 'sandbox' && !own) {
    screen = <SandboxScreen t={t} onTry={setOwn} onBack={() => setMode('walk')} />
  } else if (mode === 'sandbox' && own) {
    screen = (
      <WalkScreen
        key={`own-${own.person.length}-${own.dog.length}`}
        level={own}
        index={null}
        count={WALKS.length}
        t={t}
        onPicker={() => setPicker(true)}
        onSandbox={openSandbox}
      />
    )
  } else if (mode === 'guess') {
    screen = <GuessScreen key={walk} level={level} t={t} onPicker={() => setPicker(true)} />
  } else {
    screen = (
      <WalkScreen
        key={walk}
        level={level}
        index={index}
        count={WALKS.length}
        t={t}
        onPicker={() => setPicker(true)}
        onNext={next ? () => setWalk(next) : undefined}
        onSandbox={openSandbox}
      />
    )
  }

  return (
    <>
      {screen}
      {picker && (
        <WalkPicker
          t={t}
          mode={mode}
          onClose={() => setPicker(false)}
          onPick={(picked, m) => {
            setPicker(false)
            if (picked) setWalk(picked)
            if (m === 'sandbox') openSandbox()
            else setMode(m)
          }}
        />
      )}
    </>
  )
}
