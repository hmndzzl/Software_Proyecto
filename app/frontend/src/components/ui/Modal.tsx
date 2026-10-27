import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  closeDisabled?: boolean;
  describedBy?: string;
  initialFocusSelector?: string;
  /** Cuando se provee, muestra un ícono de "volver" a la izquierda del título
   * — para modales que navegan a una tarjeta dentro de otra (ver DetalleCompromiso). */
  onBack?: () => void;
}

export default function Modal({ open, title, subtitle, onClose, children, width = 520, onBack, closeDisabled = false, describedBy, initialFocusSelector }: ModalProps) {
  const titleId = useId();
  const subtitleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = () => { if (!closeDisabled) onClose(); }; }, [onClose, closeDisabled]);

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controles = () => Array.from(panel.current!.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    ));
    const inicial = initialFocusSelector ? panel.current?.querySelector<HTMLElement>(initialFocusSelector) : null;
    (inicial ?? controles()[0] ?? panel.current)?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key === 'Tab') {
        const elementos = controles();
        if (!elementos.length) { e.preventDefault(); panel.current?.focus(); return; }
        const primero = elementos[0];
        const ultimo = elementos[elementos.length - 1];
        if (!elementos.includes(document.activeElement as HTMLElement)) {
          e.preventDefault(); (e.shiftKey ? ultimo : primero).focus(); return;
        }
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault(); ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault(); primero.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = overflowAnterior;
      if (anterior?.isConnected) anterior.focus();
    };
  }, [open, initialFocusSelector]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={() => close.current()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy ?? (subtitle ? subtitleId : undefined)}
        tabIndex={-1}
        className={styles.panel}
        style={{ width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`${styles.header}${subtitle ? ` ${styles.headerWithSubtitle}` : ''}`}>
          {onBack && <button type="button" className={styles.backBtn} onClick={onBack} disabled={closeDisabled} aria-label="Volver a la tarjeta anterior">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>}
          {subtitle ? <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            <p id={subtitleId} className={styles.subtitle} tabIndex={0}>{subtitle}</p>
          </div> : <h2 id={titleId} className={styles.title}>{title}</h2>}
          <button type="button" className={styles.closeBtn} onClick={() => close.current()} disabled={closeDisabled} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
