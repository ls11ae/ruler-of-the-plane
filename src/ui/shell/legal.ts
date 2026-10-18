/**
 * The Impressum, privacy notice and accessibility statement of the public site are those of the
 * Algorithm Engineering Group (LS 11), TU Dortmund (Kevin, 2026-10-17). The QR codes for kiosk mode are
 * generated from these addresses into `legalQr.ts` (`npm run qr`).
 */
export const LEGAL_PAGES = [
  { id: 'imprint', url: 'https://ae.cs.tu-dortmund.de/imprint/' },
  { id: 'privacy', url: 'https://ae.cs.tu-dortmund.de/privacy/' },
  { id: 'accessibility', url: 'https://ae.cs.tu-dortmund.de/accessibility-statement/' },
] as const

export type LegalPageId = (typeof LEGAL_PAGES)[number]['id']

/** An address as people type it: without "https://" and the trailing slash. */
export function shortAddress(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
