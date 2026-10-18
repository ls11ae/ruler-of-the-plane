import { useState } from 'react'
import type { AiLevel } from '../../../core/games/voronoi/ai'
import { CASTLE_COUNTS } from '../../../core/games/voronoi/rules'
import type { VoronoiLevel } from '../../../core/levels/schema'
import { Button } from '../../components/Button'
import { Overlay } from '../../components/Overlay'
import { tierOfAi } from '../../../core/games/voronoi/tiers'
import { useT } from '../../i18n'
import { useLevel } from '../../levels'
import { ringsPath } from './drawing'
import type { VoronoiTexts } from './i18n.de'
import { MAPS, usePrefs, winKey, type MapId, type Setup } from './store'
import styles from './Voronoi.module.css'

const AI_LEVELS: AiLevel[] = ['easy', 'normal', 'hard']

function MapCard({
  id,
  selected,
  won,
  t,
  onPick,
}: {
  id: MapId
  selected: boolean
  /** Won against the computer at the chosen strength. */
  won: boolean
  t: VoronoiTexts
  onPick: () => void
}) {
  const level = useLevel<VoronoiLevel>(id)
  const name = id.split('/')[1]!
  const b = level.status === 'ready' ? level.value.bounds : { minX: -8, minY: -5, maxX: 8, maxY: 5 }
  return (
    <button type="button" className={styles.mapCard} aria-pressed={selected} onClick={onPick}>
      <svg viewBox={`${b.minX} ${b.minY} ${b.maxX - b.minX} ${b.maxY - b.minY}`} aria-hidden="true">
        <rect
          x={b.minX}
          y={b.minY}
          width={b.maxX - b.minX}
          height={b.maxY - b.minY}
          fill="var(--water)"
          opacity={0.5}
        />
        {level.status === 'ready' && (
          <path
            d={ringsPath(level.value.land)}
            fill="var(--card)"
            fillRule="evenodd"
            stroke="var(--ink)"
            strokeWidth={0.15}
          />
        )}
      </svg>
      <span className={styles.mapName}>{t.maps[name]}</span>
      <span className={styles.mapTagline}>{t.mapTaglines[name]}</span>
      {won && <span className={styles.mapWon}>{t.setup.won}</span>}
    </button>
  )
}

/**
 * "Neues Spiel": map, opponent (computer with a strength, or two players) and castles per player. The
 * strengths are the game's tiers ("Leicht", "Mittel", "Schwer"); maps won at the chosen one are marked.
 */
export function SetupOverlay({
  initial,
  defaultLevel,
  t,
  onStart,
  onClose,
  onChange,
}: {
  initial: Setup
  /** The strength of the suggested tier, used while the setup has no strength of its own. */
  defaultLevel: AiLevel
  t: VoronoiTexts
  onStart: (setup: Setup) => void
  onClose?: () => void
  /** Called on every change (e.g. to show the chosen map behind the overlay). */
  onChange?: (setup: Setup) => void
}) {
  const shell = useT()
  const wins = usePrefs((s) => s.wins)
  const [setup, setSetup] = useState(initial)
  const update = (s: Setup) => {
    setSetup(s)
    onChange?.(s)
  }
  const level = setup.aiLevel ?? defaultLevel
  return (
    <Overlay
      title={t.setup.title}
      onClose={onClose}
      actions={
        <Button variant="accent" data-autofocus onClick={() => onStart({ ...setup, aiLevel: level })}>
          {t.setup.start}
        </Button>
      }
    >
      <div className={styles.setup}>
        <section>
          <h3>{t.setup.map}</h3>
          <div className={styles.maps}>
            {MAPS.map((id) => (
              <MapCard
                key={id}
                id={id}
                selected={setup.map === id}
                won={setup.opponent === 'computer' && wins[winKey(id, level)] === true}
                t={t}
                onPick={() => update({ ...setup, map: id })}
              />
            ))}
          </div>
        </section>
        <section>
          <h3>{t.setup.opponent}</h3>
          <div className={styles.options}>
            {(['computer', 'friends'] as const).map((o) => (
              <Button
                key={o}
                small
                selected={setup.opponent === o}
                aria-pressed={setup.opponent === o}
                onClick={() => update({ ...setup, opponent: o })}
              >
                {t.setup[o]}
              </Button>
            ))}
          </div>
        </section>
        {setup.opponent === 'computer' && (
          <section>
            <h3>{t.setup.strength}</h3>
            <div className={styles.options}>
              {AI_LEVELS.map((l) => (
                <Button
                  key={l}
                  small
                  selected={level === l}
                  aria-pressed={level === l}
                  onClick={() => update({ ...setup, aiLevel: l })}
                >
                  {shell.tiers.names[tierOfAi(l)]}
                </Button>
              ))}
            </div>
          </section>
        )}
        <section>
          <h3>{t.setup.castles}</h3>
          <div className={styles.options}>
            {CASTLE_COUNTS.map((n) => (
              <Button
                key={n}
                small
                selected={setup.castles === n}
                aria-pressed={setup.castles === n}
                onClick={() => update({ ...setup, castles: n })}
              >
                {n}
              </Button>
            ))}
          </div>
        </section>
      </div>
    </Overlay>
  )
}
