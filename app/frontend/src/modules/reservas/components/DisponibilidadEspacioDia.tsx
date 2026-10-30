import styles from './DisponibilidadEspacioDia.module.css';
import { ESTADOS_RESERVA } from '../../../utils/estadosReserva';
import type { Reserva } from '../../../types';

interface Props {
  fecha: string;
  reservas: Reserva[];
  horaInicio: string;
  horaFin: string;
  hayConflicto: boolean;
}

// Franja del día que se dibuja: cubre con margen el horario real de misas/eventos del
// seed (07:00-20:00) sin desperdiciar espacio con horas en las que la parroquia no opera.
const INICIO_FRANJA_MIN = 6 * 60;
const FIN_FRANJA_MIN = 22 * 60;
const DURACION_FRANJA_MIN = FIN_FRANJA_MIN - INICIO_FRANJA_MIN;
const HORAS_ETIQUETA = [6, 9, 12, 15, 18, 21];

function minutosDesdeHora(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function posicion(inicio: string, fin: string) {
  const desde = Math.max(minutosDesdeHora(inicio), INICIO_FRANJA_MIN);
  const hasta = Math.min(minutosDesdeHora(fin), FIN_FRANJA_MIN);
  if (hasta <= desde) return null;
  return {
    left: `${((desde - INICIO_FRANJA_MIN) / DURACION_FRANJA_MIN) * 100}%`,
    width: `${((hasta - desde) / DURACION_FRANJA_MIN) * 100}%`,
  };
}

export default function DisponibilidadEspacioDia({ fecha, reservas, horaInicio, horaFin, hayConflicto }: Props) {
  const ocupadas = reservas.filter((r) => r.fecha === fecha && r.estado_reserva_id === ESTADOS_RESERVA.CONFIRMADA);
  const borrador = horaInicio && horaFin && horaInicio < horaFin ? posicion(horaInicio, horaFin) : null;

  return (
    <div className={styles.wrap}>
      <p className={styles.titulo}>Disponibilidad del {fecha.split('-').reverse().join('/')}</p>
      <div className={styles.pista} role="img" aria-label={ocupadas.length ? `${ocupadas.length} horario(s) ya confirmado(s) ese día` : 'Sin reservas confirmadas ese día'}>
        {ocupadas.map((r) => {
          const pos = posicion(r.hora_inicio, r.hora_fin);
          if (!pos) return null;
          return (
            <div
              key={r.id}
              className={styles.ocupado}
              style={pos}
              title={`Ocupado ${r.hora_inicio.slice(0, 5)}–${r.hora_fin.slice(0, 5)}${r.evento_titulo ? `: ${r.evento_titulo}` : ''}`}
            />
          );
        })}
        {borrador && (
          <div className={`${styles.borrador} ${hayConflicto ? styles.borradorConflicto : styles.borradorLibre}`} style={borrador} />
        )}
      </div>
      <div className={styles.etiquetas}>
        {HORAS_ETIQUETA.map((h) => <span key={h}>{String(h).padStart(2, '0')}:00</span>)}
      </div>
      <div className={styles.leyenda}>
        <span><i className={styles.swatchOcupado} /> Ocupado</span>
        <span><i className={`${styles.swatchBorrador} ${hayConflicto ? styles.swatchConflicto : ''}`} /> Tu horario</span>
      </div>
    </div>
  );
}
