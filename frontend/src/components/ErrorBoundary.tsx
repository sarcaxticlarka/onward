import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border p-8 text-center">
          <h2 className="text-lg font-semibold text-text-h">
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h2>
          <p className="text-sm text-text">This part of the app failed to render.</p>
          <Button size="sm" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
