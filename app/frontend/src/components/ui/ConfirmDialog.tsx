import { useId, useRef, useState, type ReactNode } from 'react';
import Modal from './Modal';
import Btn from './Btn';
import { getApiErrorMessage } from '../../utils/apiError';
import styles from './ConfirmDialog.module.css';

interface ContentProps {
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
  busyLabel?: string;
  descriptionId?: string;
}

/** Para confirmar dentro de una tarjeta abierta; el consumidor controla petición y errores. */
export function ConfirmDialogContent({ description, confirmLabel, onConfirm, onCancel, busy = false,
  busyLabel = 'Procesando…', descriptionId }: ContentProps) {
  return <div className={styles.content} aria-busy={busy}>
    <div id={descriptionId} className={styles.description}>{description}</div>
    <div className={styles.actions}>
      <Btn type="button" kind="ghost" data-confirm-cancel disabled={busy} onClick={onCancel}>Cancelar</Btn>
      <Btn type="button" kind="bad" disabled={busy} onClick={() => { if (!busy) void onConfirm(); }}>{busy ? busyLabel : confirmLabel}</Btn>
    </div>
  </div>;
}

interface Props extends ContentProps {
  open: boolean;
  title: string;
}

/** El consumidor cierra el diálogo tras completar la acción; un error permite reintentar. */
export default function ConfirmDialog({ open, title, onConfirm, onCancel, busy = false, ...content }: Props) {
  const descriptionId = useId();
  const lock = useRef(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const pendiente = busy || processing;
  const cancelar = () => {
    if (busy || lock.current) return;
    setError(''); onCancel();
  };
  const confirmar = async () => {
    if (busy || lock.current) return;
    lock.current = true; setProcessing(true); setError('');
    try { await onConfirm(); }
    catch (err) { setError(getApiErrorMessage(err, 'No se pudo completar la acción. Intenta de nuevo.')); }
    finally { lock.current = false; setProcessing(false); }
  };
  return <Modal open={open} title={title} onClose={cancelar} closeDisabled={pendiente}
    describedBy={descriptionId} initialFocusSelector="[data-confirm-cancel]">
    <ConfirmDialogContent {...content} descriptionId={descriptionId} onConfirm={confirmar} onCancel={cancelar} busy={pendiente} />
    {error && <p className={styles.error} role="alert">{error}</p>}
  </Modal>;
}
