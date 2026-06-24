import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? 'Unknown error' }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '48px 32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h2>
          <p style={{ color: 'var(--gray)', marginBottom: 8 }}>This part of the app failed to render.</p>
          {this.state.message && (
            <pre style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--cream-dark)', borderRadius: 8, padding: '8px 14px', marginBottom: 18, textAlign: 'left', overflowX: 'auto' }}>
              {this.state.message}
            </pre>
          )}
          <button
            className="black-button"
            style={{ minHeight: 48, padding: '0 24px', fontSize: 16 }}
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
