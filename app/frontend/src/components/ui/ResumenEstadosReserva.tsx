import { ESTADOS_RESERVA_ORDENADOS, obtenerEstadoReserva } from '../../utils/estadosReserva';
import styles from './ResumenEstadosReserva.module.css';

interface ResumenEstadosReservaProps {
  estadoIds: readonly number[];
}

/** Resumen reutilizable con los mismos colores semánticos que los badges de reserva. */
export default function ResumenEstadosReserva({ estadoIds }: ResumenEstadosReservaProps) {
  return (
    <div className={styles.row} aria-label="Resumen de reservas por estado">
      {ESTADOS_RESERVA_ORDENADOS.map((estadoId) => {
        const estado = obtenerEstadoReserva(estadoId);
        const cantidad = estadoIds.filter((id) => id === estadoId).length;

        return (
          <div key={estadoId} className={`${styles.chip} ${styles[estado.kind]}`}>
            <span className={styles.number}>{cantidad}</span>
            <span className={styles.label}>{estado.labelPlural}</span>
          </div>
        );
      })}
    </div>
  );
}
