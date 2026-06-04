import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Translation } from 'react-i18next'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Translation>
          {(t) => (
            <div className="p-8 text-center bg-[var(--card)] rounded-2xl border border-[var(--border)] my-8">
              <h2 className="text-xl font-bold text-[var(--text)] mb-2">{t('errorBoundary.title')}</h2>
              <p className="text-[var(--muted)] mb-4">{t('errorBoundary.description')}</p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                {t('errorBoundary.retry')}
              </button>
            </div>
          )}
        </Translation>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
