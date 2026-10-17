/**
 * Print files for the booth, generated locally (no web service), with the fonts of the repository:
 *
 *   Plakat-A2.svg/.pdf            QR poster, A2 portrait
 *   Karte-A6.svg/.pdf             the same as a card, A6 portrait
 *   Karten-A6-auf-A4.pdf          four cards on one A4 sheet, with cutting lines
 *   Spickzettel.pdf               docs/booth/spickzettel.md, which must fit on one A4 page
 *   Checkliste-Laptoptest.pdf     docs/booth/checkliste-laptoptest.md
 *
 *   npm run booth:print [-- --out <folder>]        (default docs/booth)
 *
 * Posters and cards are SVG with every text turned into outlines (opentype.js), so they look the same
 * in every program and need no fonts; Chromium (Playwright) prints the PDFs. The QR code points to the
 * public site and is encoded locally (qr.ts).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chromium } from '@playwright/test'
import { marked } from 'marked'
import opentype, { type Font } from 'opentype.js'
import { de } from '../../src/ui/i18n/de'
import { qrMatrix, qrPath } from './qr'

export const SITE_URL = 'https://ls11ae.github.io/ruler-of-the-plane/'
const root = fileURLToPath(new URL('../../', import.meta.url))
const file = (path: string) => join(root, path)

const INK = '#2b2420'
const SOFT = '#5b4f45'
const PAPER = '#f4e8cb'

/** The five games: name and tagline from the start map, the mathematics behind them, an icon. */
const GAMES = [
  { id: 'art-gallery', topic: 'Kunstgalerie-Problem', icon: 'assets/kenney/cartography-pack/towerWatch.png' },
  { id: 'voronoi', topic: 'Voronoi-Diagramm', icon: 'assets/kenney/cartography-pack/castle.png' },
  {
    id: 'frechet',
    topic: 'Fréchet-Abstand',
    icon: 'assets/kenney/animal-pack-remastered/round-outline/dog.png',
  },
  { id: 'lawn-mowing', topic: 'Rasenmäh-Problem', icon: 'assets/kenney/cartography-pack/mill.png' },
  { id: 'roads', topic: 'Spannbäume', icon: 'assets/kenney/cartography-pack/houses.png' },
] as const

const TEXTS = {
  subtitle: 'Geometrie zum Anfassen: fünf Spiele zur algorithmischen Geometrie',
  subtitleCard: 'Geometrie zum Anfassen',
  invite: 'Spiel mit – hier am Stand oder zu Hause auf dem Handy:',
  inviteCard: 'Spiel mit – auch zu Hause:',
  address: SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, ''),
  chair: 'Lehrstuhl 11 · Algorithm Engineering · TU Dortmund',
}

const font = (path: string): Font => {
  const buffer = readFileSync(file(path))
  return opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
}
const TITLE = font('assets/fonts/EagleLake-Regular.ttf')
const BODY = font('assets/fonts/PatrickHand-Regular.ttf')

const png = (path: string) => `data:image/png;base64,${readFileSync(file(path)).toString('base64')}`

/**
 * A line of text as an outline. `x` is the left end, the middle or the right end (`anchor`), `y` the
 * baseline; the size shrinks until the line fits `maxWidth`. Fails on a character the font lacks.
 */
function line(
  f: Font,
  text: string,
  x: number,
  y: number,
  size: number,
  opts: { anchor?: 'start' | 'middle' | 'end'; fill?: string; maxWidth?: number } = {},
): { svg: string; width: number } {
  for (const ch of text) {
    if (ch !== ' ' && f.charToGlyph(ch).index === 0) throw new Error(`no glyph for "${ch}" in "${text}"`)
  }
  let width = f.getAdvanceWidth(text, size, { kerning: true })
  if (opts.maxWidth && width > opts.maxWidth) {
    size *= opts.maxWidth / width
    width = opts.maxWidth
  }
  const left = opts.anchor === 'middle' ? x - width / 2 : opts.anchor === 'end' ? x - width : x
  // Path data from the commands: opentype.js 2.0's toPathData writes NaN for some sizes.
  const n = (v: number | undefined) => String(+v!.toFixed(2))
  const d = f
    .getPath(text, left, y, size, { kerning: true })
    .commands.map((c) =>
      c.type === 'Z'
        ? 'Z'
        : c.type === 'Q'
          ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`
          : c.type === 'C'
            ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`
            : `${c.type}${n(c.x)} ${n(c.y)}`,
    )
    .join('')
  if (d.includes('NaN')) throw new Error(`bad outline for "${text}"`)
  return { svg: `<path d="${d}" fill="${opts.fill ?? INK}"/>`, width }
}

function qr(x: number, y: number, size: number): string {
  const matrix = qrMatrix(SITE_URL)
  const modules = matrix.length + 8
  const unit = size / modules
  return [
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${unit}" fill="#fff" stroke="${INK}" stroke-width="${unit / 4}"/>`,
    `<path transform="translate(${x + 4 * unit} ${y + 4 * unit}) scale(${unit})" d="${qrPath(matrix)}" fill="#000" shape-rendering="crispEdges"/>`,
  ].join('\n')
}

const image = (path: string, x: number, y: number, size: number) =>
  `<image href="${png(path)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`

function frame(w: number, h: number, outer: number, inner: number, stroke: number): string {
  return [
    `<rect width="${w}" height="${h}" fill="${PAPER}"/>`,
    `<rect x="${outer}" y="${outer}" width="${w - 2 * outer}" height="${h - 2 * outer}" rx="${outer / 2}" fill="none" stroke="${INK}" stroke-width="${stroke}"/>`,
    `<rect x="${inner}" y="${inner}" width="${w - 2 * inner}" height="${h - 2 * inner}" rx="${inner / 3}" fill="none" stroke="${INK}" stroke-width="${stroke / 3}"/>`,
  ].join('\n')
}

function svgDocument(w: number, h: number, title: string, body: string[]): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">`,
    `<title>${title}</title>`,
    ...body,
    '</svg>',
    '',
  ].join('\n')
}

/** One game per row: icon, name, tagline and topic. */
function gameRows(
  top: number,
  rowHeight: number,
  s: { icon: number; x: number; name: number; tag: number; width: number },
) {
  return GAMES.flatMap((g, i) => {
    const y = top + i * rowHeight
    const place = de.places[g.id]
    const name = line(TITLE, place.name, s.x, y + s.name * 1.05, s.name, { maxWidth: s.width })
    const tag = line(BODY, place.tagline, s.x, y + s.name * 1.1 + s.tag * 1.25, s.tag, {
      maxWidth: s.width * 0.62,
    })
    const topic = line(
      BODY,
      `· ${g.topic}`,
      s.x + tag.width + s.tag * 0.4,
      y + s.name * 1.1 + s.tag * 1.25,
      s.tag,
      {
        fill: SOFT,
      },
    )
    return [
      image(
        g.icon,
        s.x - s.icon * 1.25,
        y + (s.name * 1.1 + s.tag * 1.25 - s.icon) / 2 + s.tag * 0.15,
        s.icon,
      ),
      name.svg,
      tag.svg,
      topic.svg,
    ]
  })
}

/** A2 portrait: 420 × 594 mm. */
export function poster(): string {
  const W = 420
  return svgDocument(W, 594, 'Ruler of the Plane – Plakat', [
    frame(W, 594, 12, 16.5, 1.8),
    image('assets/kenney/cartography-pack/compass.png', 28, 26, 36),
    line(TITLE, de.start.title, W / 2, 72, 46, { anchor: 'middle', maxWidth: 290 }).svg,
    line(BODY, TEXTS.subtitle, W / 2, 98, 13, { anchor: 'middle', maxWidth: 360 }).svg,
    ...gameRows(116, 46, { icon: 30, x: 90, name: 18, tag: 12, width: 300 }),
    line(BODY, TEXTS.invite, W / 2, 380, 14, { anchor: 'middle', maxWidth: 360 }).svg,
    image('assets/kenney/cartography-pack/castle.png', 52, 432, 52),
    image('assets/kenney/cartography-pack/ship.png', 316, 436, 52),
    qr(140, 392, 140),
    line(BODY, TEXTS.address, W / 2, 551, 15, { anchor: 'middle', maxWidth: 360 }).svg,
    line(BODY, TEXTS.chair, W / 2, 570, 10.5, { anchor: 'middle', fill: SOFT, maxWidth: 360 }).svg,
  ])
}

/** A6 portrait: 105 × 148 mm. */
export function card(): string {
  const W = 105
  return svgDocument(W, 148, 'Ruler of the Plane – Karte', [
    frame(W, 148, 3, 4.3, 0.6),
    line(TITLE, de.start.title, W / 2, 18, 11.5, { anchor: 'middle', maxWidth: 86 }).svg,
    line(BODY, TEXTS.subtitleCard, W / 2, 24.5, 4.4, { anchor: 'middle', maxWidth: 86 }).svg,
    ...gameRows(29, 10, { icon: 7, x: 20, name: 4.4, tag: 3.4, width: 78 }),
    line(BODY, TEXTS.inviteCard, W / 2, 84, 3.8, { anchor: 'middle', maxWidth: 86 }).svg,
    qr(W / 2 - 20, 86.5, 40),
    line(BODY, TEXTS.address, W / 2, 133, 4.3, { anchor: 'middle', maxWidth: 88 }).svg,
    line(BODY, TEXTS.chair, W / 2, 139.5, 3.1, { anchor: 'middle', fill: SOFT, maxWidth: 88 }).svg,
  ])
}

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

const svgPage = (svgs: string[], w: number, h: number, extra = '') =>
  `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${w}mm ${h}mm; margin: 0; }
html, body { margin: 0; }
body { position: relative; width: ${w}mm; height: ${h}mm; display: flex; flex-wrap: wrap; align-content: flex-start; }
svg { display: block; }
${extra}
</style></head><body>${svgs.join('')}</body></html>`

/** Pages of a PDF written by Chromium (it writes every page dictionary uncompressed). */
export function pageCount(pdf: Buffer): number {
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0
}

async function main() {
  const { values } = parseArgs({ options: { out: { type: 'string', default: 'docs/booth' } } })
  const out = values.out!
  mkdirSync(out, { recursive: true })

  const posterSvg = poster()
  const cardSvg = card()
  writeFileSync(join(out, 'Plakat-A2.svg'), posterSvg)
  writeFileSync(join(out, 'Karte-A6.svg'), cardSvg)

  const preinstalled = '/opt/pw-browsers/chromium'
  const executablePath =
    process.env.PW_CHROMIUM_EXECUTABLE ??
    (!process.env.CI && existsSync(preinstalled) ? preinstalled : undefined)
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  const page = await browser.newPage()
  const pdf = async (
    name: string,
    html: string,
    size: { width: string; height: string } | { format: 'A4' },
  ) => {
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const bytes = await page.pdf({ ...size, printBackground: true, preferCSSPageSize: true })
    writeFileSync(join(out, name), bytes)
    const pages = pageCount(bytes)
    console.log(`${join(out, name)}: ${pages} page${pages === 1 ? '' : 's'}`)
    return pages
  }

  await pdf('Plakat-A2.pdf', svgPage([posterSvg], 420, 594), { width: '420mm', height: '594mm' })
  await pdf('Karte-A6.pdf', svgPage([cardSvg], 105, 148), { width: '105mm', height: '148mm' })
  const cut = `body::before, body::after { content: ''; position: absolute; border: 0 dashed #9a9086; }
body::before { left: 105mm; top: 0; height: 297mm; border-left-width: 0.2mm; }
body::after { top: 148mm; left: 0; width: 210mm; border-top-width: 0.2mm; }`
  await pdf('Karten-A6-auf-A4.pdf', svgPage(Array(4).fill(cardSvg), 210, 297, cut), { format: 'A4' })

  const cheat = await pdf(
    'Spickzettel.pdf',
    handout(readFileSync(file('docs/booth/spickzettel.md'), 'utf8'), 'Spickzettel'),
    { format: 'A4' },
  )
  await pdf(
    'Checkliste-Laptoptest.pdf',
    handout(readFileSync(file('docs/booth/checkliste-laptoptest.md'), 'utf8'), 'Checkliste Laptoptest'),
    { format: 'A4' },
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
