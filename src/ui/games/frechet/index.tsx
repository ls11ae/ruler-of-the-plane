import { useEffect, useState } from 'react'
import { tierOfWalk, walkById, WALKS_BY_TIER, type WalkLevel } from '../../../core/games/frechet/levels'
import { woodsById } from '../../../core/games/frechet/woods/levels'
import { tierOfWoods, WOODS_BY_TIER } from '../../../core/games/frechet/woods/shapes'
import { firstOpen, TIERS, tierStars, type Tier } from '../../../core/tiers'
import { NextLabel } from '../../components/nextLabel'
import { TierScreen } from '../../components/TierScreen'
import { useLocalized, useT } from '../../i18n'
import { useSuggestedTier, useTierMemory } from '../../shell/tiers'
import { GuessScreen } from './GuessScreen'
import { HowToAnimation } from './HowToAnimation'
import { de, type FrechetTexts } from './i18n.de'
import { en } from './i18n.en'
import { tiersDe, type FrechetTierTexts } from './i18n.tiers.de'
import { tiersEn } from './i18n.tiers.en'
import { LADDER, nextStop, type Stop } from './ladder'
import { SandboxScreen } from './SandboxScreen'
import { useStop } from './stop'
import { useProgress } from './store'
import { useMedia } from './useMedia'
import { WalkPicker, type Mode } from './WalkPicker'
import { WalkScreen } from './WalkScreen'
import { woodsDe, type WoodsTexts } from './woods/i18n.de'
import { woodsEn } from './woods/i18n.en'
import { useWoodsProgress } from './woods/store'
import { WoodsCards } from './woods/WoodsCards'
import { WoodsScreen } from './woods/WoodsScreen'

const tierOfStop = (stop: Stop): Tier => (stop.kind === 'woods' ? tierOfWoods(stop.id) : tierOfWalk(stop.id))

/**
 * The first screen: the rules, and the walks in three tiers, each first in the park, then in the woods
 * (the order of "Nächstes Level"). A tier starts at its first walk without a win.
 */
function FrechetTiers({
  t,
  w,
  x,
  onStart,
}: {
  t: FrechetTexts
  w: WoodsTexts
  x: FrechetTierTexts
  onStart: (stop: Stop) => void
}) {
  const shell = useT()
  const touch = useMedia('(pointer: coarse)')
  const suggested = useSuggestedTier('frechet')
  const progress = useProgress()
  const woodsBest = useWoodsProgress((s) => s.best)
  const woods = useStop((s) => s.woods)
  const stars = (stop: Stop) =>
    (stop.kind === 'woods' ? woodsBest[stop.id]?.stars : progress.best[stop.id]?.stars) ?? 0
  const won = (stop: Stop) =>
    stop.kind === 'woods' ? woodsBest[stop.id] !== undefined : progress.best[stop.id] !== undefined
  const current: Stop = woods ? { kind: 'woods', id: woods } : { kind: 'park', id: progress.walk }
  const started =
    woods !== null ||
    progress.walk !== LADDER[0]!.id ||
    Object.keys(progress.best).length + Object.keys(woodsBest).length > 0
  const tierName = shell.tiers.names[tierOfStop(current)]
  return (
    <TierScreen
      title={t.title}
      rules={{
        lines: x.rules(touch),
        animation: <HowToAnimation label={t.howToAnimation} t={t} />,
        keys: touch
          ? undefined
          : [
              { codes: ['KeyA'], label: t.howToKeys.person },
              { codes: ['KeyL'], label: t.howToKeys.dog },
            ],
      }}
      choices={TIERS.map((tier) => ({
        tier,
        teaser: x.teasers[tier],
        stars: tierStars(
          LADDER.filter((s) => tierOfStop(s) === tier),
          stars,
        ),
      }))}
      suggested={suggested}
      resume={
        started
          ? {
              what:
                current.kind === 'woods'
                  ? x.resumeWoods(tierName, w.walks[current.id])
                  : x.resumePark(tierName, t.walks[current.id]),
              onResume: () => onStart(current),
            }
          : undefined
      }
      onPick={(tier) =>
        onStart(
          firstOpen(
            LADDER.filter((s) => tierOfStop(s) === tier),
            won,
          )!,
        )
      }
    />
  )
}

/**
 * "Gassi gehen": a person and a dog walk to the castle on their own paths, both only forwards; the
 * leash must not get too taut (Fréchet distance). Opens on the tier screen. Modes: the walks, "Schätz
 * die Leine" (guess the shortest leash), and a sandbox for drawing one's own paths. The walks come in
 * three tiers ("Leicht", "Mittel", "Schwer"), each in the park and "Im Wald"; "Nächstes Level" climbs
 * through them.
 */
export default function FrechetGame() {
  const t = useLocalized({ de, en })
  const w = useLocalized({ de: woodsDe, en: woodsEn })
  const x = useLocalized({ de: tiersDe, en: tiersEn })
  const shell = useT()
  const walk = useProgress((s) => s.walk)
  const setWalk = useProgress((s) => s.setWalk)
  const woods = useStop((s) => s.woods)
  const setWoods = useStop((s) => s.setWoods)
  const setLast = useTierMemory((s) => s.setLast)
  const [entered, setEntered] = useState(false)
  const [mode, setMode] = useState<Mode>('walk')
  const [own, setOwn] = useState<WalkLevel | null>(null)
  const [picker, setPicker] = useState(false)
  const tier = woods ? tierOfWoods(woods) : tierOfWalk(walk)
  const level = walkById(walk)
  // The tier being played is the one the tier screen marks next time.
  useEffect(() => {
    if (entered) setLast('frechet', tier)
  }, [entered, tier, setLast])
  const goTo = (stop: Stop) => {
    if (stop.kind === 'woods') return setWoods(stop.id)
    setWoods(null)
    setWalk(stop.id)
  }
  const go = (stop: Stop | undefined) => stop && (() => goTo(stop))
  const openSandbox = () => {
    setOwn(null)
    setMode('sandbox')
  }

  if (!entered) {
    return (
      <FrechetTiers
        t={t}
        w={w}
        x={x}
        onStart={(stop) => {
          goTo(stop)
          // The rules were on the tier screen (the woods keep their own "So geht's").
          useProgress.getState().setSeenHowTo()
          setMode('walk')
          setEntered(true)
        }}
      />
    )
  }

  // On a tier's last walk, "Nächstes Level" starts the next tier.
  const here: Stop = woods ? { kind: 'woods', id: woods } : { kind: 'park', id: walk }
  const after = mode === 'walk' || woods ? nextStop(here) : undefined
  const nextLabel =
    after && tierOfStop(after) !== tier ? shell.tiers.next(shell.tiers.names[tierOfStop(after)]) : null

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
    <NextLabel.Provider value={nextLabel}>
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
    </NextLabel.Provider>
  )
}
