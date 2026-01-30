import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('React render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-loading" style={{ flexDirection: 'column' }}>
          <div>Что-то пошло не так.</div>
          <div className="form-helper">{this.state.error?.message}</div>
          <button className="primary-btn" onClick={() => window.location.reload()}>
            Перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
