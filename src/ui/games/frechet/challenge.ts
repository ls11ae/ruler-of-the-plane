import { roundUp } from '../../../core/games/frechet/rules'

/** The shortest leash of the challenge: 10 cm above the shortest possible, rounded up to 0.1 m. */
export const lastStep = (shortest: number) => roundUp(shortest + 0.1)

/**
 * "Kürzere Leine": after a walk with this leash, the next shorter one to try (0.3 m shorter, rounded
 * down to 0.1 m, but not below the last step), or null when this was the last step.
 */
export function nextLeash(leash: number, shortest: number): number | null {
  const last = lastStep(shortest)
  if (leash <= last + 1e-9) return null
  return Math.max(last, Math.floor((leash - 0.3) * 10 + 1e-9) / 10)
}
