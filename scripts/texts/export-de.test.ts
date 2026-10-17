import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TEXTS_FILE, textsMarkdown } from './export-de'

describe('docs/texts-de.md', () => {
  it('holds the current German texts (otherwise run npm run texts)', async () => {
    expect(readFileSync(TEXTS_FILE, 'utf8')).toBe(await textsMarkdown())
  }, 30_000)

  it('shows every dictionary, and examples for texts with values', async () => {
    const text = await textsMarkdown()
    for (const heading of ['## Licht ins Verlies', '## Gassi gehen – Im Wald', '## Straßenbau']) {
      expect(text).toContain(heading)
    }
    expect(text).toContain('- `result.stars(n)`:\n  - n = 3: 3 Sterne von 3\n  - n = 1: 1 Stern von 3')
    expect(text).not.toContain('(kein Beispiel)')
  }, 30_000)
})
