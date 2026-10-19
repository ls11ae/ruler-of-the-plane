/** Scribble Dungeons art used by "Rasenmähen" (Kenney, CC0); listed in CREDITS.md. */
import red from '../../../../assets/kenney/scribble-dungeons/characters/red_character.png'
import purple from '../../../../assets/kenney/scribble-dungeons/characters/purple_character.png'
import grass from '../../../../assets/kenney/scribble-dungeons/grass.png'
import tiles from '../../../../assets/kenney/scribble-dungeons/tiles.png'

export const art = { paper: tiles, grass, tokens: [red, purple] as const }

/** Colours of the two cutters (their tokens are the red and purple Scribble characters). */
export const CUTTER_COLOURS = ['var(--cutter-1)', 'var(--cutter-2)'] as const
