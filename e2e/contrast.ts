import type { Page } from '@playwright/test'

/** A text whose colour does not stand out enough from what is drawn behind it. */
export interface LowContrast {
  text: string
  /** Contrast ratio against the background pixels under the text (their median). */
  ratio: number
  /** What WCAG 2.1 AA asks for this text: 4.5, or 3 for large text (24 px, or 18.66 px bold). */
  needed: number
  colour: string
  selector: string
}

interface Sample {
  text: string
  colour: [number, number, number, number]
  large: boolean
  rect: { x: number; y: number; w: number; h: number }
  selector: string
}

/**
 * Measures the contrast of every visible text on the screen (HTML text and SVG `<text>`) against the
 * pixels behind it: a screenshot with all text made transparent shows the background (parchment,
 * boards, washes), and each text's colour (with the opacity of its ancestors) is compared with the
 * pixels under its box. axe-core cannot do this for text over background images and SVG art.
 * Disabled controls are exempt (WCAG 1.4.3).
 */
export async function lowContrastTexts(page: Page): Promise<LowContrast[]> {
  await page.evaluate(() => document.fonts.ready)
  // Hit testing below must find texts that ignore the pointer (e.g. labels on a board); CSS animations
  // hold still, so the texts and the background are measured in the same frame.
  const pointer = await page.addStyleTag({
    content:
      '*, *::before, *::after { pointer-events: auto !important; animation-play-state: paused !important }',
  })
  const samples = await page.evaluate((): Sample[] => {
    const out: Sample[] = []
    const parse = (c: string): [number, number, number, number] | null => {
      const m = /rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+%?))?\)/.exec(c)
      if (!m) return null
      const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
      return [+m[1]!, +m[2]!, +m[3]!, a]
    }
    const path = (el: Element) => {
      const parts: string[] = []
      for (let e: Element | null = el; e && parts.length < 3; e = e.parentElement) {
        const cls = [...e.classList]
          .slice(0, 1)
          .map((c) => `.${c}`)
          .join('')
        parts.unshift(`${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}${cls}`)
      }
      return parts.join(' > ')
    }
    const opacityOf = (el: Element) => {
      let o = 1
      for (let e: Element | null = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity)
      return o
    }
    const disabled = (el: Element) => !!el.closest('button:disabled, [aria-disabled="true"], [inert]')
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? ''
      const el = node.parentElement
      if (!text || !el || disabled(el)) continue
      if (el.closest('[aria-hidden="true"] svg, script, style, title, desc')) continue
      const style = getComputedStyle(el)
      if (style.visibility !== 'visible') continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const r = range.getBoundingClientRect()
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0) continue
      if (r.top > innerHeight || r.left > innerWidth) continue
      // Only what is on top: the text's centre must hit the text's element (not a dialog over it).
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      if (!hit || !(hit === el || el.contains(hit) || hit.contains(el))) continue
      const svgText = el.closest('text')
      const colour = parse(svgText ? style.fill : style.color)
      if (!colour) continue
      const opacity = opacityOf(el) * (svgText ? parseFloat(style.fillOpacity) : 1)
      if (opacity < 0.05) continue
      colour[3] *= opacity
      // Text size on the screen (SVG text scales with its board).
      const size = svgText ? r.height / 1.25 : parseFloat(style.fontSize)
      const bold = parseInt(style.fontWeight, 10) >= 700
      out.push({
        text: text.slice(0, 40),
        colour,
        large: size >= 24 || (bold && size >= 18.66),
        rect: { x: r.left, y: r.top, w: r.width, h: r.height },
        selector: path(el),
      })
    }
    return out
  })

  // The background: the same screen with every text transparent.
  const hide = await page.addStyleTag({
    content: `*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important;
      text-shadow: none !important; caret-color: transparent !important }
      text, tspan, textPath { fill: transparent !important; stroke: transparent !important }`,
  })
  const png = (await page.screenshot()).toString('base64')
  await hide.evaluate((el) => (el as HTMLElement).remove())
  await pointer.evaluate((el) => (el as HTMLElement).remove())

  return page.evaluate(
    async ({ png, samples }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob())
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bitmap, 0, 0)
      const scale = bitmap.width / innerWidth
      const lum = (r: number, g: number, b: number) => {
        const f = (c: number) => {
          const s = c / 255
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
        }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
      }
      const low: LowContrast[] = []
      for (const s of samples) {
        const x = Math.max(0, Math.floor(s.rect.x * scale))
        const y = Math.max(0, Math.floor(s.rect.y * scale))
        const w = Math.min(bitmap.width - x, Math.ceil(s.rect.w * scale))
        const h = Math.min(bitmap.height - y, Math.ceil(s.rect.h * scale))
        if (w < 1 || h < 1) continue
        const data = ctx.getImageData(x, y, w, h).data
        const [fr, fg, fb, fa] = s.colour
        const ratios: number[] = []
        const step = Math.max(1, Math.floor((w * h) / 4000))
        for (let i = 0; i < w * h; i += step) {
          const br = data[i * 4]!
          const bg = data[i * 4 + 1]!
          const bb = data[i * 4 + 2]!
          // The text colour as drawn: blended over this background pixel.
          const lf = lum(fr * fa + br * (1 - fa), fg * fa + bg * (1 - fa), fb * fa + bb * (1 - fa))
          const lb = lum(br, bg, bb)
          ratios.push((Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05))
        }
        ratios.sort((a, b) => a - b)
        // The median: the box of a small glyph also covers outlines next to it (e.g. a token's ring).
        const ratio = ratios[Math.floor(ratios.length * 0.5)] ?? 21
        const needed = s.large ? 3 : 4.5
        if (ratio < needed) {
          low.push({
            text: s.text,
            ratio: Math.round(ratio * 100) / 100,
            needed,
            colour: `rgba(${s.colour.map((c, i) => (i === 3 ? c.toFixed(2) : Math.round(c))).join(', ')})`,
            selector: s.selector,
          })
        }
      }
      return low
    },
    { png, samples },
  )
}

/** A text drawn smaller than `min` px, or a control smaller than 44 × 44 px. */
export interface TooSmall {
  what: string
  size: string
  selector: string
}

/**
 * Texts below 14 px (Patrick Hand is hard to read smaller; SVG text by its height on the screen) and
 * controls (buttons, links, inputs) that do not take the pointer over 44 × 44 px, the hit target of
 * `CLAUDE.md`.
 */
export async function tooSmall(page: Page): Promise<TooSmall[]> {
  return page.evaluate(() => {
    const out: TooSmall[] = []
    const path = (el: Element) => {
      const parts: string[] = []
      for (let e: Element | null = el; e && parts.length < 3; e = e.parentElement) {
        const cls = [...e.classList]
          .slice(0, 1)
          .map((c) => `.${c}`)
          .join('')
        parts.unshift(`${e.tagName.toLowerCase()}${cls}`)
      }
      return parts.join(' > ')
    }
    const visible = (el: Element, r: DOMRect) =>
      r.width > 1 &&
      r.height > 1 &&
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < innerHeight &&
      r.left < innerWidth &&
      getComputedStyle(el).visibility === 'visible' &&
      !el.closest('[aria-hidden="true"]')
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? ''
      const el = node.parentElement
      if (!text || !el || el.closest('script, style, title, desc, pre')) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const r = range.getBoundingClientRect()
      if (!visible(el, r)) continue
      const svg = !!el.closest('text')
      const size = svg ? r.height / 1.25 : parseFloat(getComputedStyle(el).fontSize)
      if (size < 13.5)
        out.push({ what: text.slice(0, 30), size: `${size.toFixed(1)} px`, selector: path(el) })
    }
    // Controls: the pointer must hit them anywhere in the 44 × 44 px square around their centre (their
    // box, or an invisible extension such as the one of small buttons). Links inside running text are
    // exempt, as in WCAG 2.5.8; so are controls under an overlay.
    for (const el of document.querySelectorAll('button, a[href], input, select, [role="button"]')) {
      const r = el.getBoundingClientRect()
      if (!visible(el, r) || el.closest('[inert]') || el.closest('p, li, dd')?.contains(el) === true) continue
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const owns = (x: number, y: number) => {
        const hit = document.elementFromPoint(x, y)
        return !!hit && (hit === el || el.contains(hit))
      }
      if (!owns(cx, cy)) continue
      // Rows of small buttons 8 px apart share the last pixel of their extensions (borders are snapped to
      // device pixels), so probe 20 px out: a 36 px button without the extension still fails.
      const reach = 20
      // Probes in the part of a scrolling panel that is scrolled out of view do not count.
      let clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight }
      for (let e = el.parentElement; e; e = e.parentElement) {
        if (getComputedStyle(e).overflow === 'visible') continue
        const c = e.getBoundingClientRect()
        clip = {
          left: Math.max(clip.left, c.left),
          top: Math.max(clip.top, c.top),
          right: Math.min(clip.right, c.right),
          bottom: Math.min(clip.bottom, c.bottom),
        }
      }
      const probes = [
        [cx - Math.max(reach, r.width / 2 - 1), cy],
        [cx + Math.max(reach, r.width / 2 - 1), cy],
        [cx, cy - Math.max(reach, r.height / 2 - 1)],
        [cx, cy + Math.max(reach, r.height / 2 - 1)],
      ] as const
      const miss = probes.find(
        ([x, y]) => x >= clip.left && y >= clip.top && x < clip.right && y < clip.bottom && !owns(x, y),
      )
      if (miss) {
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)
        const other = document.elementFromPoint(miss[0], miss[1])
        const offset = `(${(miss[0] - cx).toFixed(0)}, ${(miss[1] - cy).toFixed(0)})`
        out.push({
          what: `control "${name}"`,
          size: `${r.width.toFixed(0)} × ${r.height.toFixed(0)}; at ${offset} the pointer hits ${other ? path(other) : 'nothing'}`,
          selector: path(el),
        })
      }
    }
    return out
  })
}
