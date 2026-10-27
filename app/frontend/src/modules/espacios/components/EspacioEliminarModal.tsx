import { useEffect, useRef, useState } from 'react';
import apiClient from '../../../api/client';
import Modal from '../../../components/ui/Modal';
import { ConfirmDialogContent } from '../../../components/ui/ConfirmDialog';
import Btn from '../../../components/ui/Btn';
import LoadingState from '../../../components/ui/LoadingState';
import ReservaEstadoBadge from '../../../components/ui/ReservaEstadoBadge';
import { getApiErrorMessage, getApiErrorStatus } from '../../../utils/apiError';
import { formatFecha, formatHorario } from '../../../utils/date';
import type { Espacio } from './EspacioCard';
import styles from './EspacioGestion.module.css';

interface ReservaImpacto {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado_reserva_id: number;
  solicitante_nombre: string;
  titulo: string | null;
}
interface Props { espacio: Espacio; onClose: () => void; onDeleted: () => void; }
const POR_PAGINA = 5;

export default function EspacioEliminarModal({ espacio, onClose, onDeleted }: Props) {
  const lock = useRef(false);
  const [reservas, setReservas] = useState<ReservaImpacto[]>([]);
  const [pagina, setPagina] = useState(1);
  const [intento, setIntento] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [listo, setListo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setCargando(true); setListo(false); setError('');
    apiClient.get<{ reservas: ReservaImpacto[] }>(`/api/espacios/${espacio.id}/impacto-eliminacion`)
      .then(({ data }) => {
        if (cancelado) return;
        setReservas(data.reservas); setPagina(1); setListo(true);
      })
      .catch(err => { if (!cancelado) setError(getApiErrorMessage(err, 'No se pudieron consultar las reservas del espacio.', 'message')); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [espacio.id, intento]);

  const eliminar = async () => {
    if (lock.current || !listo) return;
    lock.current = true; setEliminando(true); setError('');
    try {
      await apiClient.delete(`/api/espacios/${espacio.id}`, { data: { cancelar_reservas: reservas.length > 0, reserva_ids: reservas.map(r => r.id) } });
      onDeleted();
    } catch (err) {
      if (getApiErrorStatus(err) === 409) {
        const nuevas = (err as { response?: { data?: { reservas?: ReservaImpacto[] } } }).response?.data?.reservas;
        if (Array.isArray(nuevas)) { setReservas(nuevas); setPagina(1); }
        else setListo(false);
      }
      setError(getApiErrorMessage(err, 'No se pudo eliminar el espacio. Intenta de nuevo.', 'message'));
    } finally { lock.current = false; setEliminando(false); }
  };

  const paginas = Math.max(1, Math.ceil(reservas.length / POR_PAGINA));
  return <Modal open title="Eliminar espacio" onClose={onClose} closeDisabled={eliminando} width={720} initialFocusSelector="[data-confirm-cancel]">
    {cargando && <LoadingState label="Consultando reservas del espacio…" />}
    {listo && <ConfirmDialogContent busy={eliminando} busyLabel="Eliminando…" onConfirm={eliminar} onCancel={onClose}
      confirmLabel={reservas.length ? 'Cancelar reservas y eliminar espacio' : 'Eliminar espacio'}
      description={<>
        <p>Se eliminará permanentemente el espacio <strong>{espacio.nombre}</strong> y su fotografía cargada.</p>
        {reservas.length > 0 && <>
          <p>Para continuar se cancelarán todas estas reservas actuales o futuras. Se notificará a sus solicitantes.</p>
          <h3 className={styles.reservasTitle}>Reservas afectadas ({reservas.length})</h3>
          <ul className={styles.reservas}>
            {reservas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(reserva => <li key={reserva.id}>
              <strong>{reserva.titulo || `Reserva #${reserva.id}`}</strong>
              <span>{reserva.solicitante_nombre}</span>
              <span>{formatFecha(reserva.fecha)} · {formatHorario(reserva.hora_inicio, reserva.hora_fin)}</span>
              <ReservaEstadoBadge estadoId={reserva.estado_reserva_id} />
            </li>)}
          </ul>
          {paginas > 1 && <nav className={styles.pagination} aria-label="Páginas de reservas afectadas">
            <Btn type="button" kind="ghost" size="sm" disabled={pagina === 1 || eliminando} onClick={() => setPagina(p => p - 1)}>Anterior</Btn>
            <span aria-live="polite">Página {pagina} de {paginas}</span>
            <Btn type="button" kind="ghost" size="sm" disabled={pagina === paginas || eliminando} onClick={() => setPagina(p => p + 1)}>Siguiente</Btn>
          </nav>}
        </>}
        <p>Se conservarán el historial, los eventos y las tareas. Las reservas pasadas no se cancelarán; las reservas conservadas quedarán sin espacio asociado. Esta acción no se puede deshacer.</p>
      </>} />}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {!cargando && !listo && <div className={styles.actions}>
      <Btn type="button" kind="ghost" data-confirm-cancel onClick={onClose}>Cancelar</Btn>
      <Btn type="button" onClick={() => setIntento(t => t + 1)}>Volver a consultar reservas</Btn>
    </div>}
  </Modal>;
}
