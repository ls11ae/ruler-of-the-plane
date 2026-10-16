import type { Vec2 } from '../../src/core/geometry/types'
import { parseNumber } from './numbers'

/**
 * Minimal reader for the Unity `.asset` YAML of the hand-made Divide and convex hull levels: top-level
 * scalar fields of the MonoBehaviour (`NumberOfSwaps: 0`) and lists of points (`- {x: 1.5, y: -0.8}`).
 * Nothing else of YAML is supported.
 */
export interface UnityAsset {
  scalars: Record<string, string>
  pointLists: Record<string, Vec2[]>
}

export function readUnityAsset(text: string): UnityAsset {
  const scalars: Record<string, string> = {}
  const pointLists: Record<string, Vec2[]> = {}
  let inBehaviour = false
  // Key of the last field without a value: a block list if items follow, else an empty scalar.
  let listKey: string | undefined
  for (const raw of text.split(/\r?\n/)) {
    if (/^MonoBehaviour:\s*$/.test(raw)) {
      inBehaviour = true
      continue
    }
    if (!inBehaviour || raw.trim() === '') continue
    const item = /^ {2}- \{x: ([^,]+), y: ([^}]+)\}\s*$/.exec(raw)
    if (item && listKey !== undefined) {
      ;(pointLists[listKey] ??= []).push([parseNumber(item[1]!, 'x'), parseNumber(item[2]!, 'y')])
      continue
    }
    const field = /^ {2}([A-Za-z_]\w*):\s*(.*?)\s*$/.exec(raw)
    if (field) {
      const key = field[1]!
      const value = field[2]!
      listKey = value === '' ? key : undefined
      if (value === '[]') pointLists[key] = []
      else if (value !== '') scalars[key] = value
      continue
    }
    if (/^\S/.test(raw)) {
      inBehaviour = false
      continue
    }
    throw new Error(`unsupported line in Unity asset: "${raw}"`)
  }
  return { scalars, pointLists }
}
