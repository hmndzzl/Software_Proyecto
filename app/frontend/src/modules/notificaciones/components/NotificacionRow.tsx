import Badge from '../../../components/ui/Badge';
import Btn from '../../../components/ui/Btn';
import type { Notificacion } from '../../../types';
import { formatFecha } from '../../../utils/date';
import styles from './NotificacionRow.module.css';

interface Props {
  notificacion: Notificacion;
  onMarcarLeida: (id: number) => void;
  onMarcarNoLeida: (id: number) => void;
  onConfirmarAsistencia: (id: number) => void;
  onCancelarAsistencia: (id: number) => void;
  onCancelarInasistencia: (id: number) => void;
  onExcusarAsistencia: (notificacion: Notificacion) => void;
  onEliminar: (id: number) => void;
  resaltada?: boolean;
}

export default function NotificacionRow({
  notificacion,
  onMarcarLeida,
  onMarcarNoLeida,
  onConfirmarAsistencia,
  onCancelarAsistencia,
  onCancelarInasistencia,
  onExcusarAsistencia,
  onEliminar,
  resaltada = false,
}: Props) {
  const {
    id,
    mensaje,
    fecha,
    tipo,
    leida,
    requiere_confirmacion,
    asistencia_confirmada,
    motivo_excusa,
    evento_descripcion,
  } = notificacion;
  const requiereConfirmacion = Boolean(requiere_confirmacion);

  return (
    <tr id={`notificacion-${id}`} className={`${styles.row} ${!leida ? styles.rowUnread : ''} ${resaltada ? styles.rowResaltada : ''}`}>
      <td className={styles.tdFecha}>{formatFecha(fecha)}</td>
      <td className={styles.tdMensaje}>
        {mensaje}
        {requiereConfirmacion && evento_descripcion && (
          <div className={styles.eventoRef}>Evento: {evento_descripcion}</div>
        )}
        {motivo_excusa && (
          <div style={{ fontSize: '12px', color: 'var(--color-bad)', marginTop: '4px', fontStyle: 'italic' }}>
            Motivo excusa: "{motivo_excusa}"
          </div>
        )}
      </td>
      <td className={styles.tdRemitente}>
        {notificacion.remitente_nombre ?? <span className={styles.sistema}>Sistema</span>}
      </td>
      <td className={styles.tdTipo}>
        <span className={styles.tipo}>{tipo}</span>
      </td>
      <td className={styles.tdEstado}>
        <Badge kind={leida ? 'confirmada' : 'pendiente'}>
          {leida ? 'Leída' : 'No leída'}
        </Badge>
      </td>
      <td className={styles.tdAccion}>
        <div className={styles.acciones}>
          {!leida ? (
            <Btn kind="ghost" size="sm" onClick={() => onMarcarLeida(id)}>
              Marcar leída
            </Btn>
          ) : (
            <Btn kind="ghost" size="sm" onClick={() => onMarcarNoLeida(id)}>
              Marcar no leída
            </Btn>
          )}
          {requiereConfirmacion && (
            asistencia_confirmada ? (
              <>
                <Badge kind="confirmada">Asistencia confirmada</Badge>
                <Btn kind="ghost" size="sm" onClick={() => onCancelarAsistencia(id)}>
                  Cancelar asistencia
                </Btn>
              </>
            ) : motivo_excusa ? (
              <>
                <Badge kind="cancelada" title={`Motivo: ${motivo_excusa}`}>No asistirá</Badge>
                <Btn kind="ghost" size="sm" onClick={() => onCancelarInasistencia(id)}>
                  Quitar no asistencia
                </Btn>
              </>
            ) : (
              <>
                <Btn kind="ok" size="sm" onClick={() => onConfirmarAsistencia(id)}>
                  Confirmar
                </Btn>
                <Btn kind="bad" size="sm" onClick={() => onExcusarAsistencia(notificacion)}>
                  No podré asistir
                </Btn>
              </>
            )
          )}
          <Btn kind="bad" size="sm" onClick={() => onEliminar(id)}>
            Eliminar
          </Btn>
        </div>
      </td>
    </tr>
  );
}
