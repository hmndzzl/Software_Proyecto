import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** Opcional, componente personalizado de fallback */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ErrorBoundary captura errores de renderizado JS en el árbol de componentes
 * y muestra una pantalla de error amigable en su lugar.
 *
 * se usa envolviendo secciones de la app que puedan fallar en tiempo de render.
 *
 * @example
 * <ErrorBoundary>
 *   <PaginaCompleja />
 * </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'Error desconocido',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Árbol de componentes:', info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '40px 24px',
            background: 'var(--color-crema)',
            textAlign: 'center',
            gap: '20px',
          }}
        >
          {/* Ícono de error */}
          <svg
            width="56" height="56" viewBox="0 0 24 24"
            fill="none" stroke="var(--color-bad)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>

          <div style={{ maxWidth: '440px' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '.08em',
              color: 'var(--color-carbon)',
              marginBottom: '10px',
            }}>
              Algo salió mal
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: 'var(--color-muted)',
              lineHeight: 1.6,
              marginBottom: '8px',
            }}>
              Ocurrió un error inesperado en la aplicación. Puedes intentar recargar la
              página o volver al inicio.
            </p>
            {process.env.NODE_ENV !== 'production' && (
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-bad)',
                background: 'var(--color-badBg)',
                border: '1px solid rgba(157,47,47,.2)',
                borderRadius: 'var(--radius-input)',
                padding: '8px 12px',
                marginTop: '10px',
                textAlign: 'left',
                wordBreak: 'break-word',
              }}>
                {this.state.errorMessage}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                height: '44px',
                padding: '0 20px',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--color-line)',
                background: 'var(--color-blanco)',
                fontFamily: 'var(--font-body)',
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--color-carbon)',
                cursor: 'pointer',
                transition: 'background-color var(--transition)',
              }}
            >
              Intentar de nuevo
            </button>
            <button
              onClick={this.handleReload}
              style={{
                height: '44px',
                padding: '0 20px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                background: 'var(--color-rojo)',
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '.12em',
                color: 'var(--color-crema)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-btn-primary)',
                transition: 'background-color var(--transition)',
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
