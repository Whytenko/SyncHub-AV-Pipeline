import React from 'react'
import { useI18n } from '../context/I18nContext'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryInnerProps extends ErrorBoundaryProps {
  fallbackTitle: string
  reloadLabel: string
}

class ErrorBoundaryInner extends React.Component<ErrorBoundaryInnerProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('React render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-loading" style={{ flexDirection: 'column' }}>
          <div>{this.props.fallbackTitle}</div>
          <div className="form-helper">{this.state.error?.message}</div>
          <button className="primary-btn" onClick={() => window.location.reload()}>
            {this.props.reloadLabel}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const { t } = useI18n()
  return (
    <ErrorBoundaryInner
      fallbackTitle={t('Что-то пошло не так.')}
      reloadLabel={t('Перезагрузить')}
    >
      {children}
    </ErrorBoundaryInner>
  )
}

export default ErrorBoundary
