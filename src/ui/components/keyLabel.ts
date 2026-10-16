/** Short label of a `KeyboardEvent.code` or virtual gamepad code (`KeyA` → `A`). */
export function keyLabel(code: string, names: Record<string, string>): string {
  if (names[code]) return names[code]
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1]!
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code)
  if (digit) return digit[1]!
  const pad = /^Pad(\d+)(.+)$/.exec(code)
  if (pad) return `Pad ${Number(pad[1]) + 1} ${pad[2]}`
  return code.replace(/(Left|Right)$/, '')
}
