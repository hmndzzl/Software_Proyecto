import type { ReactNode } from 'react';
import Modal from './Modal';
import { formatFecha, formatHorario } from '../../utils/date';
import styles from './DetalleEventoModal.module.css';

interface DetalleEventoModalProps {
  open: boolean;
  onClose: () => void;
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  descripcion?: string | null;
  extra?: ReactNode;
}

export default function DetalleEventoModal({
  open,
  onClose,
  titulo,
  fecha,
  horaInicio,
  horaFin,
  descripcion,
  extra,
}: DetalleEventoModalProps) {
  return (
    <Modal open={open} title={titulo} onClose={onClose} width={420}>
      <div className={styles.wrap}>
        <div className={styles.row}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <span>{formatFecha(fecha)}</span>
        </div>

        <div className={styles.row}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <span>{formatHorario(horaInicio, horaFin)}</span>
        </div>

        {extra}

        {descripcion && (
          <p className={styles.descripcion}>{descripcion}</p>
        )}
      </div>
    </Modal>
  );
}
