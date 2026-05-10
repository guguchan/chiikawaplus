import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100dvh', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>🐾</div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--ink)' }}>發生錯誤</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 480 }}>{this.state.error.message}</p>
          <button className="btn-primary" onClick={() => this.setState({ error: null })}>重新嘗試</button>
        </div>
      )
    }
    return this.props.children
  }
}
