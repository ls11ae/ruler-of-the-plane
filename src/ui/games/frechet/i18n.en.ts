import type { FrechetTexts } from './i18n.de'

const metres = (m: number) => `${m.toFixed(1)} m`

/** Texts of "Gassi gehen" in English ("Walk the Dog"). */
export const en: FrechetTexts = {
  title: 'Walk the Dog',
  subtitle: (i: number, n: number, name: string) => `Castle park · ${name} · walk ${i} of ${n}`,
  subtitleTier: (tier: string, i: number, n: number, name: string) =>
    `Castle park · ${tier} · ${name} · ${i} of ${n}`,
  sandboxSubtitle: 'Castle park · your own paths',
  walks: {
    avenue: 'The avenue',
    sniffing: 'Sniffing trail',
    pond: 'At the pond',
    fetch: 'Fetch!',
    braid: 'Criss-cross',
    expert: 'For experts',
    m1: 'Chasing pigeons',
    m2: "Hare's track",
    m3: 'To and fro',
    m4: 'Up and down',
    s1: 'Zigzag',
    s2: 'Stairway',
    s3: 'Waves',
    s4: 'Sawtooth',
  },
  tiers: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
  tierLabel: 'Difficulty',
  tierIntro: {
    easy: '',
    medium: 'Tricky: just walking along does not work here. Both walk slower, so you have time to think.',
    hard: 'For experts: many dead ends and a short leash. Both walk slower.',
  },
  metres,
  leashOf: (m: number) => `of ${metres(m)} leash`,
  leashLabel: 'How taut the leash is',
  restart: 'Restart',
  picker: 'Walks',
  theoryButton: 'Theory',
  person: 'Person',
  dog: 'Dog',
  personWalks: 'Person walks',
  dogRuns: 'Dog runs',
  bothWalk: 'Both keys: both walk',
  holdLabel: (who: string) => `${who}: hold to walk`,
  start: 'Start',
  goal: 'Goal',
  board: (leash: number) => `Castle park: two paths to the castle, leash ${metres(leash)}`,
  taut: 'Leash nearly taut!',
  advice: {
    person: 'Hold only A until the person catches up.',
    dog: 'Hold only L until the dog catches up.',
  },
  adviceTouch: {
    person: 'Hold only “Person” until the person catches up.',
    dog: 'Hold only “Dog” until the dog catches up.',
  },
  deadEnd: 'Dead end: from here the leash is too short to reach the castle.',
  snappedTitle: 'Leash too taut!',
  snapped: {
    dogWait: 'The dog was too far ahead. Let it wait until the person catches up.',
    personWait: 'The person was too far ahead. Let them wait until the dog catches up.',
    earlier: 'There was no way on from here: one of them should have waited earlier.',
  },
  howTo: (leash: number, touch: boolean) => [
    touch
      ? 'Bring the person and the dog to the castle: hold “Person” or “Dog”, or both.'
      : 'Bring the person and the dog to the castle: hold A and the person walks; hold L and the dog runs.',
    `Both are equally fast, but the leash is only ${metres(leash)} long. If one is too far ahead, they must wait.`,
    touch
      ? 'It is more fun with two: each holds one button.'
      : 'With two players: one presses A, the other L.',
  ],
  howToKeys: { person: 'Person walks', dog: 'Dog runs' },
  howToAnimation: 'Person and dog walk; the dog waits until the person catches up',
  stats: (longest: number, shortest: number) =>
    `Your longest leash: ${metres(longest)} · shortest possible: ${metres(shortest)}`,
  explanation: (shortest: number, longest: number) => [
    'The computer draws every position in a diagram: to the right the person walks, upwards the dog; it is light where the leash is long enough.',
    'Every walk is a path from the bottom left to the top right that never goes back – yours is green, the computer’s dashed.',
    `The shortest leash that still leaves a light path is called the Fréchet distance: here ${metres(shortest)}, you needed ${metres(longest)}.`,
  ],
  explanationAnimation: 'Diagram of the positions with your walk and the computer’s walk',
  replay: 'Show again',
  theory: {
    title: 'Theory',
    close: 'Close the theory',
    intro:
      'Every point is a position: to the right the person walks, upwards the dog. In the light area the leash is long enough.',
    diagram: 'Diagram of the positions of person and dog',
    yours: 'your walk',
    computer: 'computer’s walk',
    slider: (m: number) => `Leash in the picture: ${metres(m)}`,
    shortest: (m: number) => `Shortest leash that works: ${metres(m)}`,
    walkExists: 'With this leash a path leads through the light to the top right.',
    noWalk: 'With this leash no path gets all the way through the light.',
    critical: (n: number, steps: number) =>
      `The computer only tries special lengths (ticks on the slider) where a passage opens. There are ${n} here; it finds the shortest one that works by halving, in ${steps} steps.`,
    previous: 'Previous special length',
    next: 'Next special length',
    probe: 'Point at the diagram: the person and the dog appear at those places in the park.',
    sandbox: 'Draw your own paths',
    narrowest: 'narrowest spot',
  },
  sandbox: {
    drawPerson: 'Draw the person’s path: press and drag.',
    drawDog: 'Now the dog’s path, from the start.',
    ready: 'Done! The diagram shows your paths.',
    tryIt: 'Try it',
    redraw: 'Draw again',
    back: 'Back to the park',
  },
  guess: {
    title: 'Guess the Leash',
    intro: 'How short can the leash be so that both reach the castle? Set a length and let the computer try.',
    slider: (m: number) => `Your leash: ${metres(m)}`,
    check: 'Try',
    checking: 'The computer is walking …',
    works: (m: number) => `${metres(m)} is enough! Can it be shorter?`,
    fails: (m: number) => `${metres(m)} is too short: where the two stop, the leash gets too taut.`,
    reveal: 'Reveal',
    tries: (n: number) => (n === 1 ? '1 try' : `${n} tries`),
    stats: (best: number | null, shortest: number) =>
      best === null
        ? `Shortest leash: ${metres(shortest)}`
        : `Your shortest leash that worked: ${metres(best)} · shortest: ${metres(shortest)}`,
    explanation: (shortest: number) => [
      'This is how the computer does it: it tries a length and checks in the diagram whether a path leads through the light; then it halves the range where the answer lies.',
      'It only needs to try special lengths where a passage opens in the diagram.',
      `So it finds the Fréchet distance in a few steps: ${metres(shortest)}.`,
    ],
  },
  challenge: {
    offer: (now: number, next: number) => `Done with ${metres(now)} – dare to try ${metres(next)}?`,
    button: (m: number) => `With a ${metres(m)} leash`,
    badge: 'Leash pro!',
    done: 'It hardly gets any shorter: you made it with almost the shortest leash.',
  },
  pickerTitle: 'Walks',
  modes: { walk: 'Walk', guess: 'Guess the Leash', sandbox: 'Draw your own paths' },
  best: (m: number) => `best leash ${metres(m)}`,
  score: (cm: number) => metres(cm / 100),
}
