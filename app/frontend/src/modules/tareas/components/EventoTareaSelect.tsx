import { useEffect, useId, useState } from 'react';
import apiClient from '../../../api/client';
import type { Evento } from '../../../types';
import { formatFecha, formatHora } from '../../../utils/date';
import styles from '../../../styles/Form.module.css';

interface Props {
  value: number | null;
  onChange: (id: number | null, evento?: Evento) => void;
  disabled?: boolean;
}

export default function EventoTareaSelect({ value, onChange, disabled }: Props) {
  const id = useId();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    setEstado('cargando');
    apiClient.get<Evento[]>('/api/eventos')
      .then(res => { if (vigente) { setEventos(res.data); setEstado('listo'); } })
      .catch(() => { if (vigente) setEstado('error'); });
    return () => { vigente = false; };
  }, [intento]);
  const opciones = eventos.filter(e => [1, 2].includes(e.estado_reserva_id ?? 2) || e.id === value);
  return <div className={styles.field}>
    <label htmlFor={id} className={styles.label}>Misa o evento asociado (opcional)</label>
    <select id={id} className={styles.input} value={value ?? ''} disabled={disabled || estado !== 'listo'}
      aria-describedby={`${id}-ayuda`} onChange={e => {
        const eventoId = e.target.value ? Number(e.target.value) : null;
        onChange(eventoId, eventos.find(evento => evento.id === eventoId));
      }}>
      <option value="">Sin evento asociado</option>
      {value && !opciones.some(e => e.id === value) && <option value={value}>Evento asociado #{value}</option>}
      {opciones.map(e => <option key={e.id} value={e.id}>
        {e.titulo || e.descripcion} · {formatFecha(e.fecha)} · {formatHora(e.hora_inicio)}{e.estado_reserva_id === 1 ? ' · Pendiente de aprobación' : ''}
      </option>)}
    </select>
    <p id={`${id}-ayuda`} className={styles.fieldNote}>La tarea puede tener un horario propio, antes o después del evento, en el mismo día.</p>
    {estado === 'cargando' && <p role="status">Cargando eventos…</p>}
    {estado === 'error' && <div role="alert">No se pudieron cargar los eventos. <button type="button" disabled={disabled} onClick={() => setIntento(n => n + 1)}>Reintentar eventos</button></div>}
  </div>;
}
