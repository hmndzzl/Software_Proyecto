import type { Tarea } from '../../types';
import { estadoEvento, horario, type Compromiso } from './calendario.utils';
import styles from './CalendarioPage.module.css';

export const nombresAsignados = (tarea: Tarea) => tarea.asignados.map(a => a.nombre).join(', ') || 'Sin asignar';

export default function CompromisosDia({ items, onSeleccionar }: { items: Compromiso[]; onSeleccionar: (item: Compromiso) => void }) {
  if (!items.length) return <p className={styles.empty}>Sin compromisos registrados</p>;
  const eventos = items.filter(item => item.tipo === 'evento');
  const tareas = items.filter(item => item.tipo === 'tarea');
  return <>
    {eventos.map(item => <article key={`evento-${item.dato.id}`} className={`${styles.card} ${styles.evento}`}>
      <span className={styles.kind}>Evento · {estadoEvento(item.dato.estado_reserva_id)}</span>
      <strong>{item.dato.titulo}</strong>
      <span>{horario(item.dato)}</span>
      <span>{item.dato.nombre_espacio || 'Lugar no indicado'}</span>
      {item.dato.tareas.length ? <ul className={styles.team}>
        {item.dato.tareas.map(t => <li key={t.id}><strong>{t.titulo}</strong><span>{horario(t)}</span><span>{nombresAsignados(t)}</span></li>)}
      </ul> : <span className={styles.note}>Sin tareas registradas</span>}
      <button type="button" className={styles.detailLink} aria-label={`Ver detalle del evento ${item.dato.titulo}`} onClick={() => onSeleccionar(item)}>Ver detalle del evento</button>
    </article>)}
    {!!tareas.length && <p className={styles.groupLabel}>Tareas sin evento asociado</p>}
    {tareas.map(item => <article key={`tarea-${item.dato.id}`} className={`${styles.card} ${styles.tarea}`}>
      <span className={styles.kind}>Tarea</span>
      <strong>{item.dato.titulo}</strong>
      <span>{horario(item.dato)}</span>
      <span>{nombresAsignados(item.dato)}</span>
      <button type="button" className={styles.detailLink} aria-label={`Ver detalle de la tarea ${item.dato.titulo}`} onClick={() => onSeleccionar(item)}>Ver detalle de la tarea</button>
    </article>)}
  </>;
}
