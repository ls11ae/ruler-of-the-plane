import { Component, type ErrorInfo, type ReactNode } from 'react'
import { LinkButton } from '../components/Button'
import { hrefFor } from './router'

interface State {
  error: Error | null
}

/**
 * Catches a crashing game so the booth never shows a blank screen: a short message and the way back to
 * the map (the kiosk timeout also returns there).
 */
export class ErrorBoundary extends Component<{ children: ReactNode; message: string; back: string }, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  override render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', gap: 16, textAlign: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: 16 }}>{this.props.message}</h2>
          <LinkButton href={hrefFor({ name: 'start' })}>{this.props.back}</LinkButton>
        </div>
      </div>
    )
  }
}
