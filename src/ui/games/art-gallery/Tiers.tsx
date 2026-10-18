import { MAIN_LEVELS, TIER_LEVELS } from '../../../core/games/art-gallery/rules'
import { firstOpen, tierPosition, TIERS, tierStars } from '../../../core/tiers'
import { TierScreen } from '../../components/TierScreen'
import { useT } from '../../i18n'
import { useSuggestedTier } from '../../shell/tiers'
import { HowToAnimation } from './HowToAnimation'
import type { ArtGalleryTexts } from './i18n.de'
import { useProgress } from './store'

/**
 * The first screen of "Licht ins Verlies": the rules, and the dungeons in three tiers (the main set
 * split by its order, the expert set as "Schwer"). A tier starts at its first dungeon without stars.
 */
export function ArtGalleryTiers({ t, onStart }: { t: ArtGalleryTexts; onStart: () => void }) {
  const shell = useT()
  const progress = useProgress()
  const suggested = useSuggestedTier('art-gallery')
  const { level, best } = progress
  const started = level !== MAIN_LEVELS[0] || Object.keys(best).length > 0
  const current = tierPosition(TIER_LEVELS, level)!
  const enter = (name: typeof level) => {
    progress.setLevel(name)
    // The rules were on the tier screen.
    progress.setSeenHowTo()
    onStart()
  }
  return (
    <TierScreen
      title={t.title}
      rules={{ lines: t.tierRules, animation: <HowToAnimation doneLabel={t.howToAnimation} /> }}
      choices={TIERS.map((tier) => ({
        tier,
        name: tier === 'hard' ? t.picker.expert : undefined,
        teaser: t.tierTeasers[tier],
        stars: tierStars(TIER_LEVELS[tier], (name) => best[name]?.stars ?? 0),
      }))}
      suggested={suggested}
      resume={
        started
          ? {
              what: t.resume(shell.tiers.names[current.tier], current.index + 1),
              onResume: () => enter(level),
            }
          : undefined
      }
      onPick={(tier) => enter(firstOpen(TIER_LEVELS[tier], (name) => best[name] !== undefined)!)}
    />
  )
}
