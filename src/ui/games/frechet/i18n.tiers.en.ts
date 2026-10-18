import type { FrechetTierTexts } from './i18n.tiers.de'

export const tiersEn: FrechetTierTexts = {
  rules: (touch: boolean) => [
    touch
      ? 'Bring the person and the dog to the castle: hold “Person” or “Dog”, or both.'
      : 'Bring the person and the dog to the castle: hold A and the person walks; hold L and the dog runs.',
    'Both are equally fast, but the leash is short: whoever is too far ahead must wait.',
    touch
      ? 'It is more fun with two: each holds one button.'
      : 'With two players: one presses A, the other L.',
  ],
  teasers: {
    easy: 'Easy walks, with hints on who has to wait.',
    medium: 'Tricky: just walking along does not work here. Who has to wait when?',
    hard: 'For experts: many dead ends and a tight leash.',
  },
  resumePark: (tier: string, name: string) => `${tier}, ${name}`,
  resumeWoods: (tier: string, name: string) => `${tier}, in the woods: ${name}`,
}
