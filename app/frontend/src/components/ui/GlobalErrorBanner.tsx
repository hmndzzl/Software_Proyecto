import { useEffect, useState } from 'react';
import { useError } from '../../context/ErrorContext';
import styles from './GlobalErrorBanner.module.css';

function ErrorIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Banner de error global no bloqueante (toast).
 * Se sitúa en la esquina inferior derecha y se auto-descarta a los 7 s.
 * Debe montarse una sola vez, dentro del árbol de ErrorProvider.
 */
export default function GlobalErrorBanner() {
  const { errorMessage, clearError } = useError();
  const [isExiting, setIsExiting] = useState(false);
  const [key, setKey] = useState(0);

  // Reiniciar la animación de entrada cada vez que llega un nuevo mensaje
  useEffect(() => {
    if (errorMessage) {
      setIsExiting(false);
      setKey((k) => k + 1);
    }
  }, [errorMessage]);

  const handleClose = () => {
    setIsExiting(true);
    // Esperar a que termine la animación de salida antes de limpiar el estado
    setTimeout(clearError, 220);
  };

  if (!errorMessage) return null;

  return (
    <div
      key={key}
      className={`${styles.banner}${isExiting ? ` ${styles.exiting}` : ''}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span className={styles.icon}>
        <ErrorIcon />
      </span>

      <div className={styles.content}>
        <p className={styles.title}>Error</p>
        <p className={styles.message}>{errorMessage}</p>
      </div>

      <button
        className={styles.closeBtn}
        onClick={handleClose}
        aria-label="Cerrar notificación de error"
        type="button"
      >
        <CloseIcon />
      </button>

      {/* Barra de progreso que representa los 7 s de auto-dismiss */}
      <div className={styles.progressBar} aria-hidden="true" />
    </div>
  );
}
