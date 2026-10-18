import { Button } from '../components/Button'
import { Overlay } from '../components/Overlay'
import { useT } from '../i18n'
import { LEGAL_PAGES, shortAddress } from './legal'
import styles from './LegalDialog.module.css'
import { LEGAL_QR } from './legalQr'
import { useSettings } from './settings'

/** A QR code from `legalQr.ts`, with the quiet zone of four modules that scanners need. */
function QrCode({ url, label }: { url: string; label: string }) {
  const qr = LEGAL_QR[url]
  if (!qr) return null
  return (
    <svg className={styles.qr} viewBox={`-4 -4 ${qr.size + 8} ${qr.size + 8}`} role="img" aria-label={label}>
      <rect x={-4} y={-4} width={qr.size + 8} height={qr.size + 8} fill="#fff" />
      <path d={qr.path} fill="#000" shapeRendering="crispEdges" />
    </svg>
  )
}

/** An address that breaks after the host name rather than inside it. */
function Address({ url }: { url: string }) {
  const [host, ...path] = shortAddress(url).split('/')
  return (
    <span className={styles.address}>
      <span className={styles.host}>{host}</span>
      {path.length > 0 && (
        <>
          <wbr />/{path.join('/')}
        </>
      )}
    </span>
  )
}

/**
 * Impressum, privacy notice and accessibility statement (the Algorithm Engineering Group's pages).
 * Outside kiosk mode they are links that open a new tab; in kiosk mode, where nothing may leave the app,
 * each shows its address and a QR code for the visitor's phone.
 */
export function LegalDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const kiosk = useSettings((s) => s.kiosk)
  return (
    <Overlay
      title={t.legal.title}
      onClose={onClose}
      className={styles.card}
      actions={
        <Button data-autofocus onClick={onClose}>
          {t.game.close}
        </Button>
      }
    >
      <p className={styles.intro}>{t.legal.intro}</p>
      <ul className={kiosk ? styles.codes : styles.links}>
        {LEGAL_PAGES.map(({ id, url }) => (
          <li key={id}>
            {kiosk ? (
              <>
                <strong>{t.legal.pages[id]}</strong>
                <QrCode url={url} label={t.legal.qr(shortAddress(url))} />
                <Address url={url} />
              </>
            ) : (
              <a className={styles.link} href={url} target="_blank" rel="noopener">
                <strong>{t.legal.pages[id]}</strong>
                <Address url={url} />
              </a>
            )}
          </li>
        ))}
      </ul>
      {kiosk && <p className={styles.scan}>{t.legal.scan}</p>}
    </Overlay>
  )
}
