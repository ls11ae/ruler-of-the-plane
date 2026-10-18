import { readFileSync } from 'node:fs'
import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { LEGAL_PAGES } from '../../src/ui/shell/legal'
import { LEGAL_QR } from '../../src/ui/shell/legalQr'
import { LEGAL_QR_FILE, legalQrModule, qrMatrix, qrPath } from './qr'

/** Reads a QR code back the way a phone camera would: from pixels (4 per module, a quiet zone of 4). */
function decode(matrix: boolean[][]): string | null {
  const scale = 4
  const size = (matrix.length + 8) * scale
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255)
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + 4) * scale + dy) * size + (x + 4) * scale + dx) * 4
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0
        }
      }
    }),
  )
  return jsQR(pixels, size, size)?.data ?? null
}

/** The modules of an SVG path written by qrPath. */
function fromPath(path: string, size: number): boolean[][] {
  const matrix = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  for (const m of path.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
    for (let i = 0; i < +m[3]!; i++) matrix[+m[2]!]![+m[1]! + i] = true
  }
  return matrix
}

describe('QR codes', () => {
  it('the legal pages in the app read back to their addresses', () => {
    for (const { url } of LEGAL_PAGES) {
      const qr = LEGAL_QR[url]!
      expect(qr, url).toBeDefined()
      expect(decode(fromPath(qr.path, qr.size))).toBe(url)
      expect(qrPath(qrMatrix(url))).toBe(qr.path)
    }
  })

  it('legalQr.ts is up to date (otherwise run npm run qr)', async () => {
    expect(readFileSync(LEGAL_QR_FILE, 'utf8')).toBe(await legalQrModule())
  })
})
