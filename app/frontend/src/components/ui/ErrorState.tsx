import ErrorMessage from './ErrorMessage';
import styles from './ErrorState.module.css';

interface ErrorStateProps {
  message: string;
  /** Callback opcional para reintentar la carga que falló */
  onRetry?: () => void;
}

/** Bloque de error estándar para reemplazar los <p>{error}</p> ad-hoc */
export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.wrap}>
      <ErrorMessage message={message} onRetry={onRetry} />
    </div>
  );
}
