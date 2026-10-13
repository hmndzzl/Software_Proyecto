import { useEffect } from 'react';
import styles from './Toast.module.css';

export type ToastKind = 'ok' | 'warn' | 'bad';

interface ToastProps {
  kind: ToastKind;
  title: string;
  message: string;
  onClose: () => void;
  /** Milisegundos hasta cerrarse solo; 0 lo deja fijo hasta que se cierre a mano. */
  duration?: number;
}

const DEFAULT_DURATION_MS = 7_000;

/**
 * Aviso no bloqueante en la esquina inferior derecha para confirmar (o fallar) una acción.
 * Se cierra solo; cualquier cambio de mensaje reinicia el temporizador.
 */
export default function Toast({ kind, title, message, onClose, duration = DEFAULT_DURATION_MS }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [title, message, duration, onClose]);

  return (
    <div
      className={`${styles.toast} ${styles[kind]}`}
      role={kind === 'bad' ? 'alert' : 'status'}
      aria-live={kind === 'bad' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className={styles.icon} aria-hidden="true">
        {kind === 'ok' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12.5l3 3 5-6" />
          </svg>
        ) : kind === 'warn' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </span>

      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{message}</p>
      </div>

      <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar aviso">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
