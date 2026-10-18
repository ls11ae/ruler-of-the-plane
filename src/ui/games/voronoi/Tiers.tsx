import type { AiLevel } from '../../../core/games/voronoi/ai'
import { AI_OF_TIER, tierOfAi } from '../../../core/games/voronoi/tiers'
import { firstOpen, TIERS } from '../../../core/tiers'
import { Button } from '../../components/Button'
import { TierScreen } from '../../components/TierScreen'
import { useT } from '../../i18n'
import { useSuggestedTier } from '../../shell/tiers'
import { HowToAnimation } from './HowToAnimation'
import type { VoronoiTexts } from './i18n.de'
import { MAPS, usePrefs, winKey, type Setup } from './store'

/**
 * The first screen of "Erobere das Land": the rules, and the computer's strength as the three tiers
 * (a star for each map won against it); "Zu zweit spielen" starts a game of two players. A tier starts
 * on its first map not won yet.
 */
export function VoronoiTiers({
  t,
  defaultLevel,
  onStart,
}: {
  t: VoronoiTexts
  /** The strength of the suggested tier, for a stored setup without one. */
  defaultLevel: AiLevel
  onStart: (setup: Setup) => void
}) {
  const shell = useT()
  const prefs = usePrefs()
  const suggested = useSuggestedTier('voronoi')
  const { wins } = prefs
  const last: Setup = {
    map: prefs.map,
    opponent: prefs.opponent,
    aiLevel: prefs.aiLevel,
    castles: prefs.castles,
  }
  const won = (level: AiLevel) => MAPS.filter((m) => wins[winKey(m, level)]).length
  const mapName = (id: string) => t.maps[id.split('/')[1]!] ?? id
  return (
    <TierScreen
      title={t.title}
      rules={{ lines: t.tierRules, animation: <HowToAnimation label={t.howToAnimation} /> }}
      choices={TIERS.map((tier) => ({
        tier,
        teaser: t.tierTeasers[tier],
        stars: { got: won(AI_OF_TIER[tier]), max: MAPS.length },
      }))}
      suggested={suggested}
      more={
        <Button variant="dashed" onClick={() => onStart({ ...last, opponent: 'friends' })}>
          {t.friends}
        </Button>
      }
      resume={
        prefs.played
          ? {
              what: t.resume(
                mapName(last.map),
                last.opponent === 'friends'
                  ? t.setup.friends
                  : shell.tiers.names[tierOfAi(last.aiLevel ?? defaultLevel)],
              ),
              onResume: () => onStart(last),
            }
          : undefined
      }
      onPick={(tier) => {
        const level = AI_OF_TIER[tier]
        const map = firstOpen(MAPS, (m) => wins[winKey(m, level)] === true)!
        onStart({ ...last, map, opponent: 'computer', aiLevel: level })
      }}
    />
  )
}
