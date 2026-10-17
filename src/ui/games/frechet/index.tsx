import { useState } from 'react'
import { tierOfWalk, walkById, WALKS_BY_TIER, type WalkLevel } from '../../../core/games/frechet/levels'
import { woodsById } from '../../../core/games/frechet/woods/levels'
import { tierOfWoods, WOODS_BY_TIER, type WoodsId } from '../../../core/games/frechet/woods/shapes'
import { useLocalized } from '../../i18n'
import { GuessScreen } from './GuessScreen'
import { de } from './i18n.de'
import { en } from './i18n.en'
import { nextStop, type Stop } from './ladder'
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
 * shortest leash), and a sandbox for drawing one's own paths. The walks come in three tiers ("Leicht",
 * "Mittel", "Schwer"), each in the park and "Im Wald"; "Nächstes Level" climbs through them.
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
  const tier = woods ? tierOfWoods(woods) : tierOfWalk(walk)
  const level = walkById(walk)
  const go = (stop: Stop | undefined) =>
    stop &&
    (() => {
      if (stop.kind === 'woods') return setWoods(stop.id)
      setWoods(null)
      setWalk(stop.id)
    })
  const openSandbox = () => {
    setOwn(null)
    setMode('sandbox')
  }

  let screen
  if (woods) {
    screen = (
      <WoodsScreen
        key={`woods-${woods}`}
        walk={woodsById(woods)}
        index={WOODS_BY_TIER[tier].indexOf(woods)}
        count={WOODS_BY_TIER[tier].length}
        tier={tier}
        t={t}
        w={w}
        onPicker={() => setPicker(true)}
        onNext={go(nextStop({ kind: 'woods', id: woods }))}
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
        count={0}
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
        index={WALKS_BY_TIER[tier].indexOf(walk)}
        count={WALKS_BY_TIER[tier].length}
        tier={tier}
        t={t}
        onPicker={() => setPicker(true)}
        onNext={go(nextStop({ kind: 'park', id: walk }))}
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
          tier={tier}
          onClose={() => setPicker(false)}
          extra={(shown) => (
            <WoodsCards
              t={t}
              w={w}
              tier={shown}
              current={woods}
              onPick={(id) => {
                setPicker(false)
                setWoods(id)
              }}
            />
          )}
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
