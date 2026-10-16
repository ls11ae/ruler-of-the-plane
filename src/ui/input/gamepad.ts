/**
 * Optional gamepad input: each connected pad is mapped to virtual key codes (`Pad0Up`, `Pad0A`, …) that
 * go through the same key state as the keyboard, so games bind them like keys.
 */

/** The part of the Gamepad API we read (easy to fake in tests). */
export interface GamepadLike {
  index: number
  mapping: string
  buttons: readonly { pressed: boolean }[]
  axes: readonly number[]
}

const AXIS_THRESHOLD = 0.5

/** Buttons of the "standard" mapping: index → name. */
const BUTTONS: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  9: 'Start',
  12: 'Up',
  13: 'Down',
  14: 'Left',
  15: 'Right',
}

export function padCode(pad: number, name: string): string {
  return `Pad${pad}${name}`
}

/** Virtual codes currently held on one gamepad (d-pad and left stick both give Up/Down/Left/Right). */
export function gamepadCodes(pad: GamepadLike): Set<string> {
  const codes = new Set<string>()
  pad.buttons.forEach((b, i) => {
    const name = BUTTONS[i]
    if (b.pressed && name) codes.add(padCode(pad.index, name))
  })
  const [x = 0, y = 0] = pad.axes
  if (x <= -AXIS_THRESHOLD) codes.add(padCode(pad.index, 'Left'))
  if (x >= AXIS_THRESHOLD) codes.add(padCode(pad.index, 'Right'))
  if (y <= -AXIS_THRESHOLD) codes.add(padCode(pad.index, 'Up'))
  if (y >= AXIS_THRESHOLD) codes.add(padCode(pad.index, 'Down'))
  return codes
}

/** Codes pressed and released between two snapshots. */
export function diffCodes(before: ReadonlySet<string>, after: ReadonlySet<string>) {
  return {
    pressed: [...after].filter((c) => !before.has(c)),
    released: [...before].filter((c) => !after.has(c)),
  }
}
