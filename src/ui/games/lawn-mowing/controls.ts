import { useEffect, useRef } from 'react'
import { STEP_REPEAT } from '../../../core/games/lawn-mowing/rules'
import type { Direction } from '../../../core/games/lawn-mowing/tour'
import { useAnimationFrame, useKeyCapture, useKeyListener } from '../../input/hooks'
import { keyboard } from '../../input/keyboard'
import { stepsDue } from '../../input/keyState'

/** A direction on screen (keys and the direction pad mean screen directions, also on a turned board). */
export type ScreenDirection = 'up' | 'down' | 'left' | 'right'

/** Cutter 1: WASD (and the first gamepad), cutter 2: the arrow keys (and the second gamepad). */
export const CUTTER_KEYS: readonly Record<string, ScreenDirection>[] = [
  {
    KeyW: 'up',
    KeyA: 'left',
    KeyS: 'down',
    KeyD: 'right',
    Pad0Up: 'up',
    Pad0Left: 'left',
    Pad0Down: 'down',
    Pad0Right: 'right',
  },
  {
    ArrowUp: 'up',
    ArrowLeft: 'left',
    ArrowDown: 'down',
    ArrowRight: 'right',
    Pad1Up: 'up',
    Pad1Left: 'left',
    Pad1Down: 'down',
    Pad1Right: 'right',
  },
]

/** "Feierabend": the space bar, or A on a gamepad. */
export const HOME_KEYS = ['Space', 'Pad0A', 'Pad1A']

/**
 * The lawn direction of a screen direction. The board shows the competition's y axis upwards; turned by
 * 90° (portrait phones, rotate(90): board (x, y) → screen (−y, x)) screen up is the lawn's left.
 */
export function toLawn(direction: ScreenDirection, rotation: 0 | 90): Direction {
  if (!rotation) return direction
  return ({ up: 'left', down: 'right', left: 'down', right: 'up' } as const)[direction]
}

/** A direction held on the on-screen pad, with the time of the press (same clock as key presses). */
export interface PadHold {
  direction: ScreenDirection
  since: number
}

interface Repeat {
  key: string
  since: number
  emitted: number
}

/**
 * Steering: per cutter the most recently pressed of its held keys (or the pad, for cutter 1) moves it one
 * lattice step at once (on the press itself, so even a short tap between two frames counts) and then at a
 * fixed rate while held, whatever the operating system's key repeat does. With one cutter, WASD and the
 * arrow keys both steer it. Returns `padDown`, to be called when a pad button is pressed.
 */
export function useCutterControls({
  cutters,
  active,
  pad,
  onStep,
  onHome,
}: {
  cutters: number
  active: boolean
  pad: React.RefObject<PadHold | null>
  onStep: (cutter: number, direction: ScreenDirection) => void
  onHome: () => void
}): { padDown: (direction: ScreenDirection) => void } {
  const keys = cutters === 1 ? [{ ...CUTTER_KEYS[0], ...CUTTER_KEYS[1] }] : CUTTER_KEYS.slice(0, cutters)
  const codes = keys.flatMap((m) => Object.keys(m))
  useKeyCapture([...codes, ...HOME_KEYS], active)
  const repeats = useRef<(Repeat | null)[]>([])
  useEffect(() => {
    if (!active) repeats.current = []
  }, [active])

  const press = (cutter: number, key: string, direction: ScreenDirection) => {
    repeats.current[cutter] = { key, since: performance.now(), emitted: 1 }
    onStep(cutter, direction)
  }

  useKeyListener(({ code, down }) => {
    if (!down) return
    if (HOME_KEYS.includes(code)) onHome()
    keys.forEach((map, i) => {
      if (map[code]) press(i, code, map[code])
    })
  }, active)

  useAnimationFrame((now) => {
    keys.forEach((map, i) => {
      let key: string | null = null
      let since = -Infinity
      for (const code of keyboard.state.held()) {
        const at = keyboard.state.pressedAt(code) ?? 0
        if (map[code] && at >= since) {
          key = code
          since = at
        }
      }
      const hold = i === 0 ? pad.current : null
      if (hold && hold.since >= since) key = `Pad:${hold.direction}`
      if (!key) {
        repeats.current[i] = null
        return
      }
      let r = repeats.current[i]
      // Back to a key that is still held after releasing a newer one: steps start again from now.
      if (!r || r.key !== key) r = repeats.current[i] = { key, since: now, emitted: 0 }
      const due = stepsDue(now - r.since, STEP_REPEAT)
      const n = Math.min(due - r.emitted, STEP_REPEAT.maxPerUpdate)
      r.emitted = Math.max(r.emitted, due)
      const direction = key.startsWith('Pad:') ? (key.slice(4) as ScreenDirection) : map[key]!
      for (let s = 0; s < n; s++) onStep(i, direction)
    })
  }, active)

  return {
    padDown: (direction) => {
      if (active) press(0, `Pad:${direction}`, direction)
    },
  }
}
