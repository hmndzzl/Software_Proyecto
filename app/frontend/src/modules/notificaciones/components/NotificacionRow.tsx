import Badge from '../../../components/ui/Badge';
import Btn from '../../../components/ui/Btn';
import type { Notificacion } from '../../../types';
import { formatFecha } from '../../../utils/date';
import styles from './NotificacionRow.module.css';

interface Props {
  notificacion: Notificacion;
  onMarcarLeida: (id: number) => void;
}

export default function NotificacionRow({ notificacion, onMarcarLeida }: Props) {
  const { id, mensaje, fecha, tipo, leida } = notificacion;

  return (
    <tr className={`${styles.row} ${!leida ? styles.rowUnread : ''}`}>
      <td className={styles.tdFecha}>{formatFecha(fecha)}</td>
      <td className={styles.tdMensaje}>{mensaje}</td>
      <td className={styles.tdTipo}>
        <span className={styles.tipo}>{tipo}</span>
      </td>
      <td className={styles.tdEstado}>
        <Badge kind={leida ? 'confirmada' : 'pendiente'}>
          {leida ? 'Leída' : 'No leída'}
        </Badge>
      </td>
      <td className={styles.tdAccion}>
        {!leida && (
          <Btn kind="ghost" size="sm" onClick={() => onMarcarLeida(id)}>
            Marcar leída
          </Btn>
        )}
      </td>
    </tr>
  );
}
