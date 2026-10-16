import { mulberry32 } from '../../random'
import { chooseMove, type AiContext, type AiLevel } from './ai'
import { exactScores, minDistance, other, playerToMove, type Castle, type Player, type Score } from './rules'

/**
 * Plays a whole game computer against computer (the attract mode, and the tests of the AI levels):
 * `levels[p]` plays for player p, `first` starts.
 */
export function playComputerGame(
  ctx: AiContext,
  levels: readonly [AiLevel, AiLevel],
  castlesPerPlayer: number,
  seed: number,
  first: Player = 0,
): { castles: Castle[]; scores: [Score, Score] } {
  const rng = mulberry32(seed)
  const minDist = minDistance(ctx.map, castlesPerPlayer)
  const castles: Castle[] = []
  const placed = [0, 0]
  while (placed[0]! + placed[1]! < 2 * castlesPerPlayer) {
    const player = playerToMove(castles, first)
    const at = chooseMove(
      ctx,
      {
        castles,
        player,
        minDist,
        opponentMovesLeft: placed[other(player)]! < castlesPerPlayer,
        level: levels[player],
      },
      rng,
    )
    placed[player]!++
    if (at) castles.push({ at, owner: player })
  }
  return { castles, scores: exactScores(ctx.map, castles).scores }
}
