import type { Tarea } from '../../types';
import ReservaEstadoBadge from '../../components/ui/ReservaEstadoBadge';
import { horario, type Compromiso } from './calendario.utils';
import styles from './CalendarioPage.module.css';

export const nombresAsignados = (tarea: Tarea) => tarea.asignados.map(a => a.nombre).join(', ') || 'Sin asignar';

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

const PersonIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

export default function CompromisosDia({ items, onSeleccionar }: { items: Compromiso[]; onSeleccionar: (item: Compromiso) => void }) {
  if (!items.length) return <p className={styles.empty}>Sin compromisos registrados</p>;
  const eventos = items.filter(item => item.tipo === 'evento');
  const tareas = items.filter(item => item.tipo === 'tarea');

  return <>
    {eventos.map(item => (
      <button
        key={`evento-${item.dato.id}`}
        type="button"
        className={`${styles.card} ${styles.evento}`}
        aria-label={`Ver detalle del evento ${item.dato.titulo}`}
        onClick={() => onSeleccionar(item)}
      >
        <div className={styles.timeRow}>
          <ClockIcon />
          <span>{horario(item.dato)}</span>
          <ReservaEstadoBadge estadoId={item.dato.estado_reserva_id} />
        </div>
        <p className={styles.taskDesc}>{item.dato.titulo}</p>
        <div className={styles.placeRow}>
          <PinIcon />
          <span className={styles.assignName}>{item.dato.nombre_espacio || 'Lugar no indicado'}</span>
        </div>
        {item.dato.tareas.length ? (
          <ul className={styles.team}>
            {item.dato.tareas.map(t => (
              <li key={t.id}>
                <strong>{t.titulo}</strong>
                <span className={styles.teamHorario}>{horario(t)}</span>
                <span className={styles.teamNombres}>{nombresAsignados(t)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className={styles.unassignedBadge}>Sin tareas</span>
        )}
      </button>
    ))}

    {!!tareas.length && <p className={styles.groupLabel}>Tareas sin evento asociado</p>}
    {tareas.map(item => (
      <button
        key={`tarea-${item.dato.id}`}
        type="button"
        className={`${styles.card} ${styles.tarea}`}
        aria-label={`Ver detalle de la tarea ${item.dato.titulo}`}
        onClick={() => onSeleccionar(item)}
      >
        <div className={styles.timeRow}>
          <ClockIcon />
          <span>{horario(item.dato)}</span>
        </div>
        <p className={styles.taskDesc}>{item.dato.titulo}</p>
        <div className={styles.assigneeRow}>
          {item.dato.asignados.length ? (
            <>
              <PersonIcon />
              <span className={styles.assignName}>{nombresAsignados(item.dato)}</span>
            </>
          ) : (
            <span className={styles.unassignedBadge}>Sin asignar</span>
          )}
        </div>
      </button>
    ))}
  </>;
}
