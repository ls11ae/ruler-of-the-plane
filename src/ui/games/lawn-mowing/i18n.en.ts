import type { LawnTexts } from './i18n.de'

export const en: LawnTexts = {
  title: 'Mow the Lawn',
  subtitle: (lawn: number, cutters: number) =>
    `Lawn ${lawn} · ${cutters === 1 ? 'one mower' : 'two mowers'} · after CG:SHOP 2027`,
  lawns: {
    lawn1: 'Front Garden',
    lawn2: 'Garden Paths',
    lawn3: 'Castle Garden',
    lawn4: 'Stepping Stones',
    lawn5: 'City Park',
  },
  lawnCard: (n: number) => `Lawn ${n}`,
  cells: (n: number) => `${n} squares`,
  mowed: 'mowed',
  mowedLabel: 'Mowed share of the lawn',
  cutter: (i: number) => `Mower ${i}`,
  steps: (n: number) => `${n} ${n === 1 ? 'step' : 'steps'}`,
  home: (n: number) => (n > 0 ? `+${n} back` : 'at the start'),
  longestTitle: 'Longer mower:',
  longestTitleOne: 'So far:',
  target: (n: number) => `Computer: ${n} steps`,
  targetStrips: (n: number) => `Strip strategy: ${n} steps`,
  space: 'Space',
  homeButton: 'Home time',
  homeHint: 'everyone back to the start',
  homeRunning: 'Everyone drives back …',
  notDone: (n: number) => `There is still grass: ${n} ${n === 1 ? 'square' : 'squares'}!`,
  allMowed: 'All mowed! Now home time: back to the start.',
  hintKeys: 'Hold a key: the mower drives. Mow everything and drive back to the start.',
  hintPad: 'Hold an arrow: the mower drives. Mow everything and drive back to the start.',
  board: (lawn: string) => `Lawn ${lawn}`,
  pad: { up: 'up', down: 'down', left: 'left', right: 'right', undo: 'Step back' },
  tierTeasers: {
    easy: 'The front garden: small, with a terrace and stone slabs – for practice.',
    medium: 'Garden paths and stepping stones: larger lawns, more to plan.',
    hard: "Here simple strategies are clearly worse than the computer's rounds.",
  },
  resume: (lawn: string, cutters: number) => `${lawn}, ${cutters === 1 ? 'alone' : 'two players'}`,
  setup: {
    title: 'New game',
    lawn: 'Lawn',
    cutters: 'Mowers',
    one: 'Alone (1 mower)',
    two: 'Two players (2 mowers)',
    phoneOne: 'On a phone you mow with one mower.',
    start: "Let's go!",
  },
  undoButton: 'Back',
  newGame: 'New',
  theoryButton: 'Theory',
  howTo: (cutters: number) => [
    'Mow the whole lawn! A mower cuts 3 × 3 squares. It may hang over the edge and drive over stone slabs – only the lawn needs mowing.',
    cutters === 1
      ? 'When everything is mowed: home time! The mower drives back to the start.'
      : 'When everything is mowed: home time! Everyone drives back to the start. The longer round counts.',
    'The fewer steps, the better.',
  ],
  howToKeys: { one: 'Mower 1', two: 'Mower 2', home: 'Home time', undo: 'Step back' },
  howToAnimation:
    'A mower drives in strips and cuts three squares wide; it drives over a small terrace, and the last strip hangs over the edge',
  result: {
    title: 'Home time!',
    stats: (longest: number, target: string) => `Longest round: ${longest} steps · ${target}`,
    score: (n: number) => `${n} steps`,
  },
  explanation: (bound: number, mine: number, reference: number, solver: boolean, cutters: number) => [
    'We want rounds that together mow the whole lawn. The longest round counts, because all mowers start at the same time.',
    `Each step cuts at most 3 new squares, so this lawn needs at least ${bound} steps. ${cutters === 1 ? `You needed ${mine}` : `Your longer round had ${mine}`}, ${solver ? 'the computer' : 'the strip strategy'} ${reference}.`,
    'Finding the shortest rounds is very hard; the computer searches long and cleverly. The animation shows its rounds on a small example.',
  ],
  explanationAnimation: "The solver's rounds on this lawn",
  exampleCaption: (cutters: number, steps: number) =>
    `Example – a small lawn: this is how the computer mows ${cutters === 1 ? 'with one mower' : 'with two mowers'}, ${steps} steps.`,
  exampleAnimation: (cutters: number) =>
    `Example: the computer's rounds ${cutters === 1 ? 'with one mower' : 'with two mowers'} on a small lawn that is none of the lawns here`,
  replay: 'Show again',
  theory: {
    title: 'Theory',
    close: 'Close the theory',
    objective:
      'The goal is called “min-max”: the longest round should be as short as possible, because the work is done only when the last mower is back.',
    bound: (n: number, k: number, bound: number) =>
      `Lower bound: ${n} squares, each step cuts at most 3 new ones, each start 9${k > 1 ? `, ${k} mowers share the work` : ''}. So the longest round needs at least ${bound} steps (a round always has an even length).`,
    solver: (n: number) => `The chair's solver manages ${n} steps.`,
    solverPending:
      "The solver's rounds are coming soon; until then the animation shows a simple strategy: strips back and forth.",
    strips: (n: number) => `The strip strategy needs ${n} steps.`,
    play: 'Watch the rounds',
    playing: 'Running …',
    competitionTitle: 'A real competition task',
    competition: (cells: number, k: number, longest: number) =>
      `CG:SHOP 2027 gives research teams lawns like this, much larger. This task has ${cells} squares and ${k} mowers; the example solution needs ${longest} steps.`,
    competitionAnimation: 'Competition task with three mowers and an example solution',
  },
}
