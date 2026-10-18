import { useState } from 'react'
import { TIER_LAWNS, type LawnId } from '../../../core/games/lawn-mowing/rules'
import { firstOpen, TIERS, tierStars } from '../../../core/tiers'
import { Button } from '../../components/Button'
import type { KeyHint } from '../../components/HowToOverlay'
import { TierScreen } from '../../components/TierScreen'
import { useSuggestedTier } from '../../shell/tiers'
import { HowToAnimation } from './HowToAnimation'
import type { LawnTexts } from './i18n.de'
import styles from './LawnMowing.module.css'
import { starsKey, usePrefs, type Setup } from './store'

const nameOf = (t: LawnTexts, lawn: LawnId) => t.lawns[lawn.split('/')[1]!] ?? lawn

/**
 * The first screen of "Rasenmähen": the rules, alone or together (one or two mowers; phones mow
 * alone), and the lawns in three tiers with the stars for that number of mowers. A tier starts on its
 * first lawn without stars.
 */
export function LawnTiers({
  t,
  phone,
  rules,
  onStart,
}: {
  t: LawnTexts
  phone: boolean
  rules: (cutters: 1 | 2) => { lines: string[]; keys?: KeyHint[] }
  onStart: (setup: Setup) => void
}) {
  const prefs = usePrefs()
  const suggested = useSuggestedTier('lawn-mowing')
  const [cutters, setCutters] = useState<1 | 2>(phone ? 1 : prefs.cutters)
  const stars = (lawn: LawnId) => prefs.stars[starsKey(lawn, cutters)] ?? 0
  const { lines, keys } = rules(cutters)
  return (
    <TierScreen
      title={t.title}
      rules={{ lines, keys, animation: <HowToAnimation label={t.howToAnimation} /> }}
      options={
        phone ? undefined : (
          <div className={styles.options} role="group" aria-label={t.setup.cutters}>
            {([1, 2] as const).map((k) => (
              <Button
                key={k}
                small
                selected={cutters === k}
                aria-pressed={cutters === k}
                onClick={() => setCutters(k)}
              >
                {k === 1 ? t.setup.one : t.setup.two}
              </Button>
            ))}
          </div>
        )
      }
      choices={TIERS.map((tier) => ({
        tier,
        name: TIER_LAWNS[tier].map((lawn) => nameOf(t, lawn)).join(' · '),
        teaser: t.tierTeasers[tier],
        stars: tierStars(TIER_LAWNS[tier], stars),
      }))}
      suggested={suggested}
      resume={
        prefs.played
          ? {
              what: t.resume(nameOf(t, prefs.lawn), phone ? 1 : prefs.cutters),
              onResume: () => onStart({ lawn: prefs.lawn, cutters: phone ? 1 : prefs.cutters }),
            }
          : undefined
      }
      onPick={(tier) => onStart({ lawn: firstOpen(TIER_LAWNS[tier], (l) => stars(l) > 0)!, cutters })}
    />
  )
}
