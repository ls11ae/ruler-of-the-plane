/** Scribble Dungeons art used by "Licht ins Verlies" (Kenney, CC0); listed in CREDITS.md. */
import barrel from '../../../../assets/kenney/scribble-dungeons/barrel.png'
import barrels from '../../../../assets/kenney/scribble-dungeons/barrels.png'
import chest from '../../../../assets/kenney/scribble-dungeons/chest.png'
import crateSmall from '../../../../assets/kenney/scribble-dungeons/crate_small.png'
import tiles from '../../../../assets/kenney/scribble-dungeons/tiles.png'
import token from '../../../../assets/kenney/scribble-dungeons/characters/yellow_character.png'

/** Grid-paper floor tile (2 × 2 cells). */
export const floorTile = tiles
/** The torch's token (a yellow disc with an ink ring); the flame is drawn on top in SVG. */
export const torchToken = token
/** Props scattered on the floor as decoration (under the light). */
export const props = [barrels, chest, crateSmall, barrel] as const
