import { useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { ESTADOS_RESERVA, avisoCambioEstadoReserva } from '../../utils/estadosReserva';
import { ROLES, rolTieneAcceso } from '../../utils/roles';
import Modal from '../../components/ui/Modal';
import Btn from '../../components/ui/Btn';
import { nombresAsignados } from './CompromisosDia';
import { estadoEvento, fechaCompleta, horario, type Compromiso } from './calendario.utils';
import styles from './CalendarioPage.module.css';

interface DetalleCompromisoProps {
  item: Compromiso;
  onClose: () => void;
  /** Refresca el calendario tras aprobar/rechazar — la reserva cambia de estado. */
  onActualizado?: () => void;
}

export default function DetalleCompromiso({ item, onClose, onActualizado }: DetalleCompromisoProps) {
  const { usuario } = useAuth();
  const toast = useToast();
  const [actualizando, setActualizando] = useState(false);
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
    } finally {
      setActualizando(false);
    }
  };

  return <Modal open title={item.dato.titulo} onClose={onClose} width={720}>
    <div className={styles.detail}>
      <p>{fechaCompleta(item.dato.fecha)}</p>
      <p>{horario(item.dato)}</p>
      {item.tipo === 'evento' ? <>
        <p><strong>Estado:</strong> {estadoEvento(item.dato.estado_reserva_id)}</p>
        <p><strong>Lugar:</strong> {item.dato.nombre_espacio || 'Lugar no indicado'}</p>
        <p><strong>Encargado:</strong> {item.dato.nombre_encargado}</p>

        {/* Misma acción que ListaReservas: aprobar/rechazar sin salir del calendario. */}
        {esPrivilegiado && item.dato.estado_reserva_id === ESTADOS_RESERVA.PENDIENTE && (
          <div className={styles.detailActions}>
            <Btn kind="ok" size="sm" onClick={() => cambiarEstado(ESTADOS_RESERVA.CONFIRMADA)} disabled={actualizando}>
              Aprobar
            </Btn>
            {usuario && item.dato.encargado_id === usuario.id ? (
              <Btn kind="bad" size="sm" onClick={() => cambiarEstado(ESTADOS_RESERVA.CANCELADA)} disabled={actualizando}>
                Cancelar
              </Btn>
            ) : (
              <Btn kind="bad" size="sm" onClick={() => cambiarEstado(ESTADOS_RESERVA.RECHAZADA)} disabled={actualizando}>
                Rechazar
              </Btn>
            )}
          </div>
        )}

        <h3>Quién sirve en este evento</h3>
        {item.dato.tareas.length ? <ul className={styles.serviceList}>{item.dato.tareas.map(t => <li key={t.id}>
          <strong>Tarea: {t.titulo}</strong><span>Horario de servicio: {horario(t)}</span><span>Ministros asignados: {nombresAsignados(t)}</span>
        </li>)}</ul> : <p>Sin tareas registradas para tu consulta.</p>}
      </> : <p><strong>Ministros asignados:</strong> {nombresAsignados(item.dato)}</p>}
      {item.dato.descripcion && <p>{item.dato.descripcion}</p>}
    </div>
  </Modal>;
}
