import Badge from '../../../components/ui/Badge';
import Btn from '../../../components/ui/Btn';
import type { Notificacion } from '../../../types';
import { formatFecha } from '../../../utils/date';
import styles from './NotificacionRow.module.css';

interface Props {
  notificacion: Notificacion;
  onMarcarLeida: (id: number) => void;
  onConfirmarAsistencia: (id: number) => void;
}

export default function NotificacionRow({ notificacion, onMarcarLeida, onConfirmarAsistencia }: Props) {
  const { id, mensaje, fecha, tipo, leida, requiere_confirmacion, asistencia_confirmada, evento_descripcion } = notificacion;

  return (
    <tr className={`${styles.row} ${!leida ? styles.rowUnread : ''}`}>
      <td className={styles.tdFecha}>{formatFecha(fecha)}</td>
      <td className={styles.tdMensaje}>
        {mensaje}
        {requiere_confirmacion && evento_descripcion && (
          <div className={styles.eventoRef}>Evento: {evento_descripcion}</div>
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
          {!leida && (
            <Btn kind="ghost" size="sm" onClick={() => onMarcarLeida(id)}>
              Marcar leída
            </Btn>
          )}
          {requiere_confirmacion && (
            asistencia_confirmada ? (
              <Badge kind="confirmada">Asistencia confirmada</Badge>
            ) : (
              <Btn kind="ok" size="sm" onClick={() => onConfirmarAsistencia(id)}>
                Confirmar asistencia
              </Btn>
            )
          )}
        </div>
      </td>
    </tr>
  );
}
