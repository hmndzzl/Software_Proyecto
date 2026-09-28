import { useState } from 'react';
import Badge from '../../../components/ui/Badge';
import type { NotificacionEnviada } from '../../../types';
import { formatFecha } from '../../../utils/date';
import styles from './NotificacionRow.module.css';
import destStyles from './EnviadaRow.module.css';

const NOMBRES_VISIBLES = 3;

interface Props {
  notificacion: NotificacionEnviada;
}

export default function EnviadaRow({ notificacion }: Props) {
  const { mensaje, fecha, tipo, total_destinatarios, total_leidas, destinatarios_nombres } = notificacion;
  const [expandido, setExpandido] = useState(false);

  const lista = destinatarios_nombres ? destinatarios_nombres.split(', ') : [];
  const hayMasDeLosVisibles = lista.length > NOMBRES_VISIBLES;
  const resumen = hayMasDeLosVisibles ? lista.slice(0, NOMBRES_VISIBLES).join(', ') : destinatarios_nombres;

  return (
    <tr className={styles.row}>
      <td className={styles.tdFecha}>{formatFecha(fecha)}</td>
      <td className={styles.tdMensaje}>{mensaje}</td>
      <td className={destStyles.destinatarios}>
        {destinatarios_nombres ? (
          <>
            {expandido ? destinatarios_nombres : resumen}
            {hayMasDeLosVisibles && (
              <button type="button" className={destStyles.verMas} onClick={() => setExpandido((v) => !v)}>
                {expandido ? 'Ver menos' : `y ${lista.length - NOMBRES_VISIBLES} más`}
              </button>
            )}
          </>
        ) : (
          <span className={styles.sistema}>Sin destinatarios (eliminada por todos)</span>
        )}
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
