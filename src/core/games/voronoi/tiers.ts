import type { Tier } from '../../tiers'
import type { AiLevel } from './ai'

/** The tiers of "Erobere das Land" are the computer's strength ("Mittel" is the AI level `normal`). */
export const AI_OF_TIER: Record<Tier, AiLevel> = { easy: 'easy', medium: 'normal', hard: 'hard' }

export const tierOfAi = (level: AiLevel): Tier => (level === 'normal' ? 'medium' : level)
