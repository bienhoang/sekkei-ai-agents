import { Component, type ReactNode } from 'react'
import { Zap } from '../lib/icons'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8 max-w-md">
            <div className="flex justify-center mb-3 text-[var(--color-danger)]">
              <Zap size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] transition-colors duration-200 cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
