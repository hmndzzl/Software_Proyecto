import { useId, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { ESTADOS_RESERVA, avisoCambioEstadoReserva } from '../../utils/estadosReserva';
import { ROLES, rolTieneAcceso } from '../../utils/roles';
import Modal from '../../components/ui/Modal';
import Btn from '../../components/ui/Btn';
import { ConfirmDialogContent } from '../../components/ui/ConfirmDialog';
import { nombresAsignados } from './CompromisosDia';
import { estadoEvento, fechaCompleta, horario, type Compromiso } from './calendario.utils';
import styles from './CalendarioPage.module.css';

interface DetalleCompromisoProps {
  item: Compromiso;
  onClose: () => void;
  /** Refresca el calendario tras aprobar/rechazar — la reserva cambia de estado. */
  onActualizado?: () => void;
  /** Permite abrir, desde este mismo modal, el detalle de una tarea asociada al evento. */
  onSeleccionar?: (item: Compromiso) => void;
  /** Cuando se llegó a esta tarjeta desde otra (p. ej. una tarea dentro de un evento),
   * vuelve a mostrar esa tarjeta anterior en vez de cerrar el modal. */
  onVolver?: () => void;
}

export default function DetalleCompromiso({ item, onClose, onActualizado, onSeleccionar, onVolver }: DetalleCompromisoProps) {
  const { usuario } = useAuth();
  const toast = useToast();
  const [actualizando, setActualizando] = useState(false);
  const [estadoPorConfirmar, setEstadoPorConfirmar] = useState<number | null>(null);
  const [errorConfirmacion, setErrorConfirmacion] = useState('');
  const confirmacionId = useId();
  const esPrivilegiado = rolTieneAcceso(usuario?.rol_id, [ROLES.SACERDOTE]);

  const cambiarEstado = async (nuevoEstado: number) => {
    if (item.tipo !== 'evento') return;
    setActualizando(true);
    try {
      await apiClient.put(`/api/reservas/${item.dato.reserva_id}/estado`, { estado_id: nuevoEstado });
      const aviso = avisoCambioEstadoReserva(nuevoEstado);
      toast.success(aviso.titulo, aviso.mensaje);
      onActualizado?.();
    } catch (err: unknown) {
      toast.error('No se pudo actualizar la reserva', getApiErrorMessage(err, 'Error al cambiar el estado de la reserva.', 'message'));
      throw err;
    } finally {
      setActualizando(false);
    }
  };

  return <Modal open title={estadoPorConfirmar === ESTADOS_RESERVA.CANCELADA ? 'Cancelar reserva' : estadoPorConfirmar !== null ? 'Rechazar reserva' : item.dato.titulo} onClose={onClose} onBack={onVolver} width={720}
    subtitle={estadoPorConfirmar === null && item.tipo === 'evento' ? item.dato.descripcion : undefined}
    closeDisabled={actualizando} describedBy={estadoPorConfirmar !== null ? confirmacionId : undefined}>
    {estadoPorConfirmar !== null ? <>
      <ConfirmDialogContent descriptionId={confirmacionId} busy={actualizando}
      confirmLabel={estadoPorConfirmar === ESTADOS_RESERVA.CANCELADA ? 'Cancelar reserva' : 'Rechazar reserva'}
      description={estadoPorConfirmar === ESTADOS_RESERVA.CANCELADA
        ? `¿Cancelar la reserva «${item.dato.titulo}» del ${fechaCompleta(item.dato.fecha)}? Se liberará el espacio reservado.`
        : `¿Rechazar la solicitud «${item.dato.titulo}»?`}
      onCancel={() => { setEstadoPorConfirmar(null); setErrorConfirmacion(''); }} onConfirm={async () => {
        try {
          await cambiarEstado(estadoPorConfirmar);
          setEstadoPorConfirmar(null);
          setErrorConfirmacion('');
        } catch (err: unknown) {
          setErrorConfirmacion(getApiErrorMessage(err, 'Error al cambiar el estado de la reserva.', 'message'));
        }
      }} />
      {errorConfirmacion && <p role="alert">{errorConfirmacion}</p>}
    </> : <>
    <div className={styles.detail}>
      <div className={styles.detailSection}>
        <p>{fechaCompleta(item.dato.fecha)}</p>
        <p>{horario(item.dato)}</p>
      </div>

      {item.tipo === 'evento' ? <>
        <div className={styles.detailSection}>
          <p><strong>Estado:</strong> {estadoEvento(item.dato.estado_reserva_id)}</p>
          <p><strong>Lugar:</strong> {item.dato.nombre_espacio || 'Lugar no indicado'}</p>
          <p><strong>Encargado:</strong> {item.dato.nombre_encargado}</p>
        </div>

        {/* Misma acción que ListaReservas: aprobar/rechazar sin salir del calendario. */}
        {esPrivilegiado && item.dato.estado_reserva_id === ESTADOS_RESERVA.PENDIENTE && (
          <div className={styles.detailSection}>
            <div className={styles.detailActions}>
              <Btn kind="ok" size="sm" onClick={() => { void cambiarEstado(ESTADOS_RESERVA.CONFIRMADA).catch(() => {}); }} disabled={actualizando}>
                Aprobar
              </Btn>
              {usuario && item.dato.encargado_id === usuario.id ? (
                <Btn kind="bad" size="sm" onClick={() => { setErrorConfirmacion(''); setEstadoPorConfirmar(ESTADOS_RESERVA.CANCELADA); }} disabled={actualizando}>
                  Cancelar
                </Btn>
              ) : (
                <Btn kind="bad" size="sm" onClick={() => { setErrorConfirmacion(''); setEstadoPorConfirmar(ESTADOS_RESERVA.RECHAZADA); }} disabled={actualizando}>
                  Rechazar
                </Btn>
              )}
            </div>
          </div>
        )}

        <div className={styles.detailSection}>
          <h3 className={styles.detailSectionTitle}>Tareas asociadas a este evento</h3>
          {item.dato.tareas.length ? <ul className={styles.serviceList}>{item.dato.tareas.map(t => <li key={t.id}>
            <button type="button" className={styles.serviceItem} disabled={!onSeleccionar}
              aria-label={`Ver detalle de la tarea ${t.titulo}`}
              onClick={() => onSeleccionar?.({ tipo: 'tarea', dato: t })}>
              <strong>{t.titulo}</strong>
              <span>Horario de servicio: {horario(t)}</span>
              <span>Ministros asignados: {nombresAsignados(t)}</span>
            </button>
          </li>)}</ul> : <p>Sin tareas registradas para tu consulta.</p>}
        </div>
      </> : <div className={styles.detailSection}>
        <p><strong>Ministros asignados:</strong> {nombresAsignados(item.dato)}</p>
      </div>}

      {item.tipo !== 'evento' && item.dato.descripcion && <div className={styles.detailSection}><p>{item.dato.descripcion}</p></div>}
    </div>
    </>}
  </Modal>;
}
