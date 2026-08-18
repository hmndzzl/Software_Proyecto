import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  message: string;
  /** Callback opcional para reintentar la acción que falló */
  onRetry?: () => void;
}

/** Ícono de alerta (SVG inline para evitar dependencias externas) */
function AlertIcon() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
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

/** Ícono de reintentar */
function RetryIcon() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
    </svg>
  );
}

/* Primitivo de error inline */
export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className={styles.box} role="alert" aria-live="assertive">
      <span className={styles.icon}>
        <AlertIcon />
      </span>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
        {onRetry && (
          <button className={styles.retry} onClick={onRetry} type="button">
            <RetryIcon />
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
