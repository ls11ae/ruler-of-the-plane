import { useState, type ReactNode } from 'react'
import dog from '../../../assets/kenney/animal-pack-remastered/round-outline/dog.png'
import barrels from '../../../assets/kenney/scribble-dungeons/barrels.png'
import chest from '../../../assets/kenney/scribble-dungeons/chest.png'
import redToken from '../../../assets/kenney/scribble-dungeons/characters/red_character.png'
import tree from '../../../assets/kenney/scribble-dungeons/tree.png'
import yellowToken from '../../../assets/kenney/scribble-dungeons/characters/yellow_character.png'
import { cartography } from '../art/cartography'
import { Button } from '../components/Button'
import { GameHeader } from '../components/GameHeader'
import { useT, type ShellTexts } from '../i18n'
import styles from './Credits.module.css'
import { tspBoardsUrl } from './places'
import { useSettings } from './settings'

/** The runtime libraries (the `dependencies` and Workbox; a test checks that every dependency is here). */
const LIBRARIES: readonly {
  name: string
  packages: readonly string[]
  licence: string
  use: keyof ShellTexts['credits']['uses']
}[] = [
  { name: 'React, React DOM', packages: ['react', 'react-dom'], licence: 'MIT', use: 'ui' },
  { name: 'zustand', packages: ['zustand'], licence: 'MIT', use: 'state' },
  { name: 'robust-predicates', packages: ['robust-predicates'], licence: 'Unlicense', use: 'predicates' },
  { name: 'clipper2-ts (Clipper2)', packages: ['clipper2-ts'], licence: 'BSL-1.0', use: 'clipper' },
  { name: 'earcut', packages: ['earcut'], licence: 'ISC', use: 'earcut' },
  { name: 'd3-delaunay, Delaunator', packages: ['d3-delaunay'], licence: 'ISC', use: 'delaunay' },
  { name: 'Workbox', packages: ['workbox-window'], licence: 'MIT', use: 'workbox' },
]

/** A few pictures of each Kenney pack the app uses. */
const PACKS = [
  {
    name: 'Cartography Pack',
    pictures: [
      cartography.castle,
      cartography.towerWatch,
      cartography.mill,
      cartography.ship,
      cartography.treePines,
    ],
  },
  { name: 'Scribble Dungeons', pictures: [yellowToken, redToken, chest, barrels, tree] },
  { name: 'Animal Pack Remastered', pictures: [dog] },
]

/** An address: a link that opens a new tab, but plain text in kiosk mode, where nothing leaves the app. */
function Address({ url }: { url: string }) {
  const kiosk = useSettings((s) => s.kiosk)
  const text = url.replace(/^https:\/\//, '').replace(/\/$/, '')
  if (kiosk) return <span className={styles.address}>{text}</span>
  return (
    <a className={styles.address} href={url} target="_blank" rel="noopener">
      {text}
    </a>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

/** CREDITS.md and every licence text, as written by the build (`credits.txt`), shown on demand. */
function FullText() {
  const t = useT()
  const [text, setText] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const toggle = () => {
    setOpen(!open)
    if (text !== null || open) return
    fetch(`${import.meta.env.BASE_URL}credits.txt`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then(setText, () => setFailed(true))
  }
  return (
    <div className={styles.full}>
      <Button onClick={toggle} aria-expanded={open}>
        {open ? t.credits.hideFull : t.credits.full}
      </Button>
      {open && failed && <p role="alert">{t.credits.fullFailed}</p>}
      {open && text !== null && (
        <pre className={styles.text} tabIndex={0}>
          {text}
        </pre>
      )}
    </div>
  )
}

/** The credits screen (`#/credits`): who made the games, the art, fonts and libraries, and their licences. */
export function Credits() {
  const t = useT()
  const c = t.credits
  return (
    <div className={styles.screen}>
      <GameHeader title={c.title} subtitle={c.subtitle} />
      <main className={styles.scroll}>
        <div className={styles.content}>
          <Section title={c.edition}>
            <p>
              {c.editionText} <Address url="https://github.com/ls11ae/ruler-of-the-plane" />
            </p>
          </Section>
          <Section title={c.original}>
            <p>
              {c.originalText} <Address url="https://github.com/kbuchin/ruler" />
            </p>
            <dl className={styles.roles}>
              <dt>{c.roles.lead}</dt>
              <dd>Kevin Buchin</dd>
              <dt>{c.roles.programming}</dt>
              <dd>Sander Beekhuis, Kevin Buchin, Thom Hurks, Stijn Slot</dd>
              <dt>{c.roles.art}</dt>
              <dd>Willem Sonke, Thom Castermans</dd>
              <dt>{c.roles.dots}</dt>
              <dd>Jolan Rensen, leovsch</dd>
            </dl>
          </Section>
          <Section title={c.levels}>
            <dl className={styles.roles}>
              {(['art-gallery', 'lawn-mowing', 'roads'] as const).map((id) => (
                <div key={id}>
                  <dt>{t.places[id].name}</dt>
                  <dd>{c.levelTexts[id]}</dd>
                </div>
              ))}
            </dl>
            <p>{c.levelTexts.new}</p>
          </Section>
          <Section title={c.art}>
            <p>{c.artText}</p>
            <ul className={styles.packs}>
              {PACKS.map((pack) => (
                <li key={pack.name}>
                  <span>{pack.name}</span>
                  <span className={styles.pictures} aria-hidden="true">
                    {pack.pictures.map((src) => (
                      <img key={src} src={src} alt="" draggable={false} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title={c.fonts}>
            <p>{c.fontsText}</p>
          </Section>
          <Section title={c.libraries}>
            <p>{c.librariesText}</p>
            <ul className={styles.libraries}>
              {LIBRARIES.map((lib) => (
                <li key={lib.name}>
                  <strong>{lib.name}</strong> ({lib.licence}): {c.uses[lib.use]}
                </li>
              ))}
            </ul>
          </Section>
          {tspBoardsUrl() && (
            <Section title={c.tsp}>
              <p>{c.tspText}</p>
            </Section>
          )}
          <FullText />
        </div>
      </main>
    </div>
  )
}
