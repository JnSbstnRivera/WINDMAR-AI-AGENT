'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error Boundary global. React requiere class component para esto (no hay
 * equivalente de hooks aún para captura de errores).
 *
 * Si cualquier componente hijo lanza un error de render/lifecycle, en vez de
 * mostrar pantalla blanca o crash del navegador, este componente intercepta y
 * muestra una UI amigable con SUN BOT triste + botón de recarga.
 *
 * Los errores se loguean a console para debugging (Vercel los captura).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Vercel captura console.error en logs de runtime
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#eef4fa] dark:bg-[#0a1628] px-4 text-center">
        <div className="relative flex items-center justify-center mb-6" style={{ width: 120, height: 120 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(220,80,80,0.55) 0%, rgba(220,80,80,0.15) 50%, transparent 75%)',
              filter: 'blur(14px)',
            }}
          />
          <img
            src="/sunbot-error.png"
            alt="Algo salió mal"
            className="mascot-img relative z-10 w-24 h-24 object-contain drop-shadow-lg"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1B3A5C] dark:text-white mb-2">
          ¡Ups! Algo se rompió.
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          La aplicación tuvo un problema inesperado. Esto NO afecta a tus conversaciones guardadas.
          Recarga la página para volver al chat.
        </p>
        {this.state.errorMessage && (
          <details className="mb-6 text-xs text-gray-400 max-w-md">
            <summary className="cursor-pointer hover:text-gray-600">Detalles técnicos</summary>
            <p className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded font-mono text-left break-all">
              {this.state.errorMessage}
            </p>
          </details>
        )}
        <button
          onClick={this.handleReload}
          className="bg-gradient-to-br from-[#F7941D] to-[#e8830d] hover:from-[#e8830d] hover:to-[#d97700] text-white rounded-xl px-6 py-3 font-semibold transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
          style={{ boxShadow: '0 4px 12px rgba(247,148,29,0.4)' }}
        >
          ↻ Recargar página
        </button>
      </div>
    );
  }
}
