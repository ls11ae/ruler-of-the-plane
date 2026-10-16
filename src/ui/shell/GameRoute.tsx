import { lazy, Suspense, type ReactElement } from 'react'
import { LinkButton } from '../components/Button'
import { GAME_IDS, gameLoader, type GameId } from '../games/registry'
import { useT } from '../i18n'
import { ErrorBoundary } from './ErrorBoundary'
import { useGameStates } from './places'
import { hrefFor } from './router'

/** One lazily loaded game screen per built game, created once at start-up. */
const GAMES = new Map<GameId, ReactElement>(
  GAME_IDS.flatMap((id) => {
    const load = gameLoader(id)
    if (!load) return []
    const Game = lazy(load)
    return [[id, <Game />] as const]
  }),
)

function Message({ text }: { text: string }) {
  const t = useT()
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.6rem' }}>{text}</p>
        <LinkButton href={hrefFor({ name: 'start' })}>{t.game.back}</LinkButton>
      </div>
    </div>
  )
}

/** A game screen, loaded on demand; games switched off or not built yet show a message instead. */
export function GameRoute({ game }: { game: GameId }) {
  const t = useT()
  const state = useGameStates()[game]
  const screen = GAMES.get(game)
  if (state !== 'open' || !screen) {
    return (
      <Message text={`${t.places[game].name}: ${state === 'closed' ? t.start.closed : t.game.missing}`} />
    )
  }
  return (
    <ErrorBoundary key={game} message={t.game.crashed} back={t.game.back}>
      <Suspense fallback={<Message text={t.game.loading} />}>{screen}</Suspense>
    </ErrorBoundary>
  )
}
