import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ErrorContextType {
  /** Mensaje de error actual, o null si no hay error activo */
  errorMessage: string | null;
  /** Muestra un mensaje de error global (auto-dismiss en 7 s) */
  showError: (message: string) => void;
  /** Limpia el error manualmente */
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | null>(null);

const AUTO_DISMISS_MS = 7_000;

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timerId, setTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    if (timerId !== null) {
      clearTimeout(timerId);
      setTimerId(null);
    }
  }, [timerId]);

  const showError = useCallback(
    (message: string) => {
      // Si ya había un timer corriendo, se cancela
      if (timerId !== null) clearTimeout(timerId);

      setErrorMessage(message);

      const id = setTimeout(() => {
        setErrorMessage(null);
        setTimerId(null);
      }, AUTO_DISMISS_MS);

      setTimerId(id);
    },
    [timerId],
  );

  return (
    <ErrorContext.Provider value={{ errorMessage, showError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de errores globales.
 *
 * @example
 * const { showError } = useError();
 * showError('No se pudo cargar la lista de ministros.');
 */
export function useError() {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error('useError debe usarse dentro de ErrorProvider');
  return ctx;
}
