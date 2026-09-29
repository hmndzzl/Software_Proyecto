import Btn from '../../../components/ui/Btn';
import type { NotificacionPapelera } from '../../../types';
import { formatFecha } from '../../../utils/date';
import styles from './NotificacionRow.module.css';

interface Props {
  notificacion: NotificacionPapelera;
  onRestaurar: (id: number) => void;
}

export default function PapeleraRow({ notificacion, onRestaurar }: Props) {
  const { id, mensaje, fecha, tipo, remitente_nombre } = notificacion;

  return (
    <tr className={styles.row}>
      <td className={styles.tdFecha}>{formatFecha(fecha)}</td>
      <td className={styles.tdMensaje}>{mensaje}</td>
      <td className={styles.tdRemitente}>
        {remitente_nombre ?? <span className={styles.sistema}>Sistema</span>}
      </td>
      <td className={styles.tdTipo}>
        <span className={styles.tipo}>{tipo}</span>
      </td>
      <td className={styles.tdAccion}>
        <div className={styles.acciones}>
          <Btn kind="ghost" size="sm" onClick={() => onRestaurar(id)}>
            Restaurar
          </Btn>
        </div>
      </td>
    </tr>
  );
}
