import Badge from '../../../components/ui/Badge';
import type { NotificacionEnviada } from '../../../types';
import { formatFecha } from '../../../utils/date';
import styles from './NotificacionRow.module.css';

interface Props {
  notificacion: NotificacionEnviada;
}

export default function EnviadaRow({ notificacion }: Props) {
  const { mensaje, fecha, tipo, total_destinatarios, total_leidas, destinatarios_nombres } = notificacion;

  return (
    <tr className={styles.row}>
      <td className={styles.tdFecha}>{formatFecha(fecha)}</td>
      <td className={styles.tdMensaje}>{mensaje}</td>
      <td className={styles.tdRemitente}>
        {destinatarios_nombres ?? <span className={styles.sistema}>Sin destinatarios (eliminada por todos)</span>}
      </td>
      <td className={styles.tdTipo}>
        <span className={styles.tipo}>{tipo}</span>
      </td>
      <td className={styles.tdEstado}>
        <Badge kind={total_destinatarios > 0 && total_leidas === total_destinatarios ? 'confirmada' : 'pendiente'}>
          {total_leidas}/{total_destinatarios} leídas
        </Badge>
      </td>
    </tr>
  );
}
