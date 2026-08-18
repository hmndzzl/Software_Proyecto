import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Btn from '../../../components/ui/Btn';
import type { Notificacion } from '../../../types';
import styles from './ModalExcusaAsistencia.module.css';

interface Props {
  open: boolean;
  notificacion: Notificacion | null;
  onClose: () => void;
  onConfirmar: (notificacionId: number, motivo: string) => Promise<void>;
}

const MIN_CHARS = 5;
const MAX_CHARS = 400;

export default function ModalExcusaAsistencia({
  open,
  notificacion,
  onClose,
  onConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (enviando) return;
    setMotivo('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!notificacion) return;

    const motivoTrim = motivo.trim();
    if (motivoTrim.length < MIN_CHARS) {
      setError(`El motivo debe tener al menos ${MIN_CHARS} caracteres.`);
      return;
    }

    setEnviando(true);
    setError('');

    try {
      await onConfirmar(notificacion.id, motivoTrim);
      setMotivo('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar la excusa. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (!notificacion) return null;

  const chars = motivo.trim().length;
  const charWarn = chars > MAX_CHARS * 0.85;

  return (
    <Modal
      open={open}
      title="Excusar Asistencia"
      onClose={handleClose}
      width={500}
    >
      <div className={styles.infoBox}>
        {notificacion.evento_descripcion && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Evento:</span>
            <span>{notificacion.evento_descripcion}</span>
          </div>
        )}
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Notificación:</span>
          <span>{notificacion.mensaje}</span>
        </div>
      </div>

      <div>
        <label className={styles.fieldLabel} htmlFor="motivo-excusa">
          Motivo de inasistencia / Excusa
        </label>
        <textarea
          id="motivo-excusa"
          className={styles.textarea}
          placeholder="Explica brevemente por qué no podrás asistir a este evento…"
          value={motivo}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) setMotivo(e.target.value);
            if (error) setError('');
          }}
          disabled={enviando}
        />
        <p className={`${styles.charCount}${charWarn ? ` ${styles.warn}` : ''}`}>
          {chars} / {MAX_CHARS}
        </p>

        {error && (
          <p style={{
            color: 'var(--color-bad)',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 600,
            marginTop: '6px',
          }}>
            {error}
          </p>
        )}
      </div>

      <div className={styles.actions}>
        <Btn kind="ghost" size="sm" onClick={handleClose} disabled={enviando}>
          Cancelar
        </Btn>
        <Btn kind="bad" size="sm" onClick={handleSubmit} disabled={enviando || chars < MIN_CHARS}>
          {enviando ? 'Guardando…' : 'Enviar excusa'}
        </Btn>
      </div>
    </Modal>
  );
}
