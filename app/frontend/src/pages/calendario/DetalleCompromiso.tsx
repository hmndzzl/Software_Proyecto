import Modal from '../../components/ui/Modal';
import { nombresAsignados } from './CompromisosDia';
import { estadoEvento, fechaCompleta, horario, type Compromiso } from './calendario.utils';
import styles from './CalendarioPage.module.css';

export default function DetalleCompromiso({ item, onClose }: { item: Compromiso; onClose: () => void }) {
  return <Modal open title={item.dato.titulo} onClose={onClose} width={720}>
    <div className={styles.detail}>
      <p>{fechaCompleta(item.dato.fecha)}</p>
      <p>{horario(item.dato)}</p>
      {item.tipo === 'evento' ? <>
        <p><strong>Estado:</strong> {estadoEvento(item.dato.estado_reserva_id)}</p>
        <p><strong>Lugar:</strong> {item.dato.nombre_espacio || 'Lugar no indicado'}</p>
        <p><strong>Encargado:</strong> {item.dato.nombre_encargado}</p>
        <h3>Quién sirve en este evento</h3>
        {item.dato.tareas.length ? <ul className={styles.serviceList}>{item.dato.tareas.map(t => <li key={t.id}>
          <strong>Tarea: {t.titulo}</strong><span>Horario de servicio: {horario(t)}</span><span>Ministros asignados: {nombresAsignados(t)}</span>
        </li>)}</ul> : <p>Sin tareas registradas para tu consulta.</p>}
      </> : <p><strong>Ministros asignados:</strong> {nombresAsignados(item.dato)}</p>}
      {item.dato.descripcion && <p>{item.dato.descripcion}</p>}
    </div>
  </Modal>;
}
