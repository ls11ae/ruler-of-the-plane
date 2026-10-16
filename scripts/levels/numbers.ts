const NUMBER = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/

/**
 * Culture-invariant number parsing: only `.` as decimal separator, no thousands separators. Throws on
 * anything else, so a German-formatted "28,1853" fails loudly instead of becoming 281853 (the bug of
 * the Unity importer).
 */
export function parseNumber(text: string, context = 'number'): number {
  const s = text.trim()
  if (!NUMBER.test(s)) throw new Error(`invalid ${context}: "${text}"`)
  return Number(s)
}

/** Parses a whitespace-separated list of numbers. */
export function parseNumbers(text: string, context = 'numbers'): number[] {
  const parts = text.trim().split(/\s+/)
  return parts.map((p) => parseNumber(p, context))
}
