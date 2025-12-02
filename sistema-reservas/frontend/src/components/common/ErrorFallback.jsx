import React, { useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * ErrorFallback Component
 *
 * UI elegante mostrada cuando ErrorBoundary captura un error.
 * Incluye opciones de recuperación y detalles técnicos para debugging.
 */
const ErrorFallback = ({ error, errorInfo, errorCount, onReset, onReload }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyError = () => {
    const errorDetails = `
Error: ${error?.toString()}

Component Stack:
${errorInfo?.componentStack}

User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
Error Count: ${errorCount}
    `.trim();

    navigator.clipboard.writeText(errorDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Card principal */}
        <div className="bg-card border-2 border-destructive/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 p-8 border-b">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Algo salió mal
                </h1>
                <p className="text-muted-foreground">
                  La aplicación encontró un error inesperado. No te preocupes, tus datos
                  están seguros.
                </p>
              </div>
            </div>

            {/* Error count badge */}
            {errorCount > 1 && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-full text-sm text-destructive font-medium">
                <AlertTriangle className="w-4 h-4" />
                Este error ha ocurrido {errorCount} veces
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-8 space-y-6">
            {/* Mensaje de error principal */}
            <div className="p-4 bg-muted rounded-lg border">
              <p className="text-sm font-mono text-foreground break-all">
                {error?.toString() || 'Error desconocido'}
              </p>
            </div>

            {/* Acciones principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={onReset}
                variant="default"
                size="lg"
                className="w-full bg-primary hover:bg-primary/90"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar de nuevo
              </Button>
              <Button
                onClick={handleGoHome}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Ir al inicio
              </Button>
            </div>

            {/* Acción secundaria */}
            <Button
              onClick={onReload}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Recargar página completa
            </Button>

            {/* Detalles técnicos (colapsable) */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-4 py-3 bg-muted/50 hover:bg-muted transition flex items-center justify-between text-sm font-medium"
                aria-expanded={showDetails}
              >
                <span>Detalles técnicos (para desarrolladores)</span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showDetails && (
                <div className="p-4 bg-card border-t space-y-4">
                  {/* Stack trace */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                      Component Stack:
                    </label>
                    <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                      {errorInfo?.componentStack || 'No disponible'}
                    </pre>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Timestamp:</span>
                      <p className="font-mono mt-1">
                        {new Date().toLocaleString('es-CL')}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Error Count:</span>
                      <p className="font-mono mt-1">{errorCount}</p>
                    </div>
                  </div>

                  {/* Botón copiar */}
                  <Button
                    onClick={handleCopyError}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={copied}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        Copiar detalles del error
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Mensaje de ayuda */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Si el problema persiste, contacta al administrador del sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Footer con info adicional */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Hotel Don Teo - Sistema de Gestión de Reservas</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
