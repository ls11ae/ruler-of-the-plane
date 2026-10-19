/** Scribble Dungeons art used by "Rasenmähen" (Kenney, CC0); listed in CREDITS.md. */
import red from '../../../../assets/kenney/scribble-dungeons/characters/red_character.png'
import purple from '../../../../assets/kenney/scribble-dungeons/characters/purple_character.png'
import tiles from '../../../../assets/kenney/scribble-dungeons/tiles.png'

export const art = { paper: tiles, tokens: [red, purple] as const }

/** Colours of the two cutters (their tokens are the red and purple Scribble characters). */
export const CUTTER_COLOURS = ['var(--cutter-1)', 'var(--cutter-2)'] as const

/**
 * The lawn's colours (Kevin, 2026-10-19: mowed and unmowed must differ clearly, above all on phones):
 * uncut grass a darker, fuller green with tufts, mowed cells much lighter with stripes, so colour is not
 * the only cue.
 */
export const LAWN = {
  grass: '#5d9f3c',
  grassLine: '#4c8a2f',
  tuft: '#2a5c18',
  mowed: '#dbf0c4',
  mowedStripe: '#c9e6aa',
} as const
