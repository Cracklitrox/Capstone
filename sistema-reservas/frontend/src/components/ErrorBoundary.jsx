import React from 'react';
import ErrorFallback from './ErrorFallback';

/**
 * ErrorBoundary Component
 *
 * Captura errores de JavaScript en cualquier parte del árbol de componentes hijo,
 * registra esos errores y muestra una UI de respaldo en lugar de colapsar toda la app.
 *
 * Uso:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Actualizar el estado para que el próximo render muestre la UI de respaldo
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Registrar error para debugging
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('📍 Component Stack:', errorInfo.componentStack);

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // TODO: Enviar a servicio de logging (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorCount={this.state.errorCount}
          onReset={this.handleReset}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
