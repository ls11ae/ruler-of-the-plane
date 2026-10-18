/**
 * Print files for the booth staff, generated locally with the fonts of the repository:
 *
 *   Spickzettel.pdf               docs/booth/spickzettel.md, which must fit on one A4 page
 *   Checkliste-Laptoptest.pdf     docs/booth/checkliste-laptoptest.md
 *
 *   npm run booth:print [-- --out <folder>]        (default docs/booth)
 *
 * Chromium (Playwright) prints the PDFs. Posters and cards with the QR code of the site are not needed:
 * the print material of tsp-boards covers Ruler of the Plane (Kevin, 2026-10-18).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chromium } from '@playwright/test'
import { marked } from 'marked'

const root = fileURLToPath(new URL('../../', import.meta.url))
const file = (path: string) => join(root, path)

const INK = '#2b2420'
const SOFT = '#5b4f45'

const fontFaces = () => {
  const face = (family: string, path: string) =>
    `@font-face { font-family: '${family}'; src: url(data:font/ttf;base64,${readFileSync(file(path)).toString('base64')}) format('truetype'); }`
  return (
    face('Eagle Lake', 'assets/fonts/EagleLake-Regular.ttf') +
    face('Patrick Hand', 'assets/fonts/PatrickHand-Regular.ttf')
  )
}

/** A handout from Markdown: the app's fonts, ink on white (cheaper to print), A4. */
function handout(markdown: string, title: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title}</title><style>
${fontFaces()}
@page { size: A4; margin: 11mm 12mm 10mm; }
html { font-family: 'Patrick Hand', 'DejaVu Sans', sans-serif; font-size: 10.6pt; line-height: 1.2; color: ${INK}; }
body { margin: 0; }
h1, h2 { font-family: 'Eagle Lake', serif; font-weight: normal; break-after: avoid; }
h1 { font-size: 18pt; margin: 0 0 1mm; }
h1 + p { margin-top: 0; color: ${SOFT}; }
h2 { font-size: 12pt; margin: 3.2mm 0 1mm; padding-bottom: 0.4mm; border-bottom: 0.3mm solid ${INK}; }
p { margin: 1mm 0; }
ul, ol { margin: 0.6mm 0; padding-left: 5mm; }
li { margin: 0.5mm 0; break-inside: avoid; }
li:has(> input[type=checkbox]) { list-style: none; margin-left: -5mm; padding-left: 6mm; text-indent: -6mm; }
input[type=checkbox] { appearance: none; width: 3.2mm; height: 3.2mm; margin: 0 2.3mm 0 0; border: 0.3mm solid ${INK}; border-radius: 0.6mm; vertical-align: -0.5mm; }
code { font-family: 'DejaVu Sans Mono', monospace; font-size: 0.82em; }
strong { font-weight: bold; }
</style></head><body>${marked.parse(markdown, { async: false })}</body></html>`
}

/** Pages of a PDF written by Chromium (it writes every page dictionary uncompressed). */
export function pageCount(pdf: Buffer): number {
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0
}

async function main() {
  const { values } = parseArgs({ options: { out: { type: 'string', default: 'docs/booth' } } })
  const out = values.out!
  mkdirSync(out, { recursive: true })

  const preinstalled = '/opt/pw-browsers/chromium'
  const executablePath =
    process.env.PW_CHROMIUM_EXECUTABLE ??
    (!process.env.CI && existsSync(preinstalled) ? preinstalled : undefined)
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  const page = await browser.newPage()
  const pdf = async (name: string, html: string) => {
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const bytes = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
    writeFileSync(join(out, name), bytes)
    const pages = pageCount(bytes)
    console.log(`${join(out, name)}: ${pages} page${pages === 1 ? '' : 's'}`)
    return pages
  }

  const cheat = await pdf(
    'Spickzettel.pdf',
    handout(readFileSync(file('docs/booth/spickzettel.md'), 'utf8'), 'Spickzettel'),
  )
  await pdf(
    'Checkliste-Laptoptest.pdf',
    handout(readFileSync(file('docs/booth/checkliste-laptoptest.md'), 'utf8'), 'Checkliste Laptoptest'),
  )
  await browser.close()
  if (cheat !== 1) {
    console.error(
      `The cheat sheet must fit on one A4 page, it has ${cheat}: shorten docs/booth/spickzettel.md.`,
    )
    process.exit(1)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
