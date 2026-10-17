import { useState } from 'react'
import { WALK_IDS, WALKS, walkById, type WalkLevel } from '../../../core/games/frechet/levels'
import { woodsById } from '../../../core/games/frechet/woods/levels'
import { WOODS_IDS, type WoodsId } from '../../../core/games/frechet/woods/shapes'
import { useLocalized } from '../../i18n'
import { GuessScreen } from './GuessScreen'
import { de } from './i18n.de'
import { en } from './i18n.en'
import { SandboxScreen } from './SandboxScreen'
import { useProgress } from './store'
import { WalkPicker, type Mode } from './WalkPicker'
import { WalkScreen } from './WalkScreen'
import { woodsDe } from './woods/i18n.de'
import { woodsEn } from './woods/i18n.en'
import { WoodsCards } from './woods/WoodsCards'
import { WoodsScreen } from './woods/WoodsScreen'

/**
 * "Gassi gehen": a person and a dog walk to the castle on their own paths, both only forwards; the
 * leash must not get too taut (Fréchet distance). Modes: the walks, "Schätz die Leine" (guess the
 * shortest leash), and a sandbox for drawing one's own paths; the bonus walks "Im Wald" follow the
 * six walks.
 */
export default function FrechetGame() {
  const t = useLocalized({ de, en })
  const w = useLocalized({ de: woodsDe, en: woodsEn })
  const walk = useProgress((s) => s.walk)
  const setWalk = useProgress((s) => s.setWalk)
  const [mode, setMode] = useState<Mode>('walk')
  const [own, setOwn] = useState<WalkLevel | null>(null)
  const [picker, setPicker] = useState(false)
  const [woods, setWoods] = useState<WoodsId | null>(null)
  const index = WALK_IDS.indexOf(walk)
  const next = WALK_IDS[index + 1]
  const level = walkById(walk)
  const openSandbox = () => {
    setOwn(null)
    setMode('sandbox')
  }

  let screen
  if (woods) {
    const nextWoods = WOODS_IDS[WOODS_IDS.indexOf(woods) + 1]
    screen = (
      <WoodsScreen
        key={`woods-${woods}`}
        walk={woodsById(woods)}
        index={WOODS_IDS.indexOf(woods)}
        count={WOODS_IDS.length}
        t={t}
        w={w}
        onPicker={() => setPicker(true)}
        onNext={nextWoods ? () => setWoods(nextWoods) : undefined}
      />
    )
  } else if (mode === 'sandbox' && !own) {
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
        onNext={() => (next ? setWalk(next) : setWoods(WOODS_IDS[0]))}
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
          extra={
            <WoodsCards
              t={t}
              w={w}
              current={woods}
              onPick={(id) => {
                setPicker(false)
                setWoods(id)
              }}
            />
          }
          onPick={(picked, m) => {
            setPicker(false)
            setWoods(null)
            if (picked) setWalk(picked)
            if (m === 'sandbox') openSandbox()
            else setMode(m)
          }}
        />
      )}
    </>
  )
}
