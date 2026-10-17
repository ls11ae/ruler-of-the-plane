import { LEVEL_IDS, SET_OF_TIER, setOf, TIER_LEVELS } from '../../../core/games/roads/levels'
import { firstOpen, TIERS, tierStars } from '../../../core/tiers'
import { TierScreen } from '../../components/TierScreen'
import { useSuggestedTier } from '../../shell/tiers'
import { HowToAnimation } from './HowToAnimation'
import type { RoadsTexts } from './i18n.de'
import { useProgress } from './store'

/**
 * The first screen of "Straßenbau": the rules of the first set, and the three sets as tiers ("Von Ort
 * zu Ort", "Kreuzungen", "Zwei Sorten"). A tier starts at its first map without stars.
 */
export function RoadsTiers({ t, onStart }: { t: RoadsTexts; onStart: () => void }) {
  const progress = useProgress()
  const suggested = useSuggestedTier('roads')
  const { level, stars } = progress
  const started = level > 0 || Object.keys(stars).length > 0
  const enter = (index: number) => {
    progress.setLevel(index)
    // The tier screen showed the rules of the first set; the other sets bring their own "So geht's".
    progress.setSeenHowTo('mst')
    onStart()
  }
  const current = level < LEVEL_IDS.length ? setOf(level) : null
  return (
    <TierScreen
      title={t.title}
      rules={{ lines: t.howTo, animation: <HowToAnimation label={t.howToAnimation} done={t.optimal} /> }}
      choices={TIERS.map((tier) => ({
        tier,
        name: t.sets[SET_OF_TIER[tier]],
        teaser: t.tierTeasers[tier],
        stars: tierStars(TIER_LEVELS[tier], (id) => stars[id] ?? 0),
      }))}
      suggested={suggested}
      resume={
        started
          ? {
              what: current ? t.resume(t.sets[current.set], current.index + 1) : t.picker.random,
              onResume: () => enter(level),
            }
          : undefined
      }
      onPick={(tier) => {
        const ids = TIER_LEVELS[tier]
        const id = firstOpen(ids, (x) => (stars[x] ?? 0) > 0)!
        enter(LEVEL_IDS.indexOf(id))
      }}
    />
  )
}
