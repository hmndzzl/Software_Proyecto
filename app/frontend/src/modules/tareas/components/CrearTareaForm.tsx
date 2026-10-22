import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';
import local from './TareaForm.module.css';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import type { Ministro, Tarea } from '../../../types';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';

const TOPE_SERVICIOS_MES = 8;

export default function CrearTareaForm({ refreshKey, onTareaCreada }: { refreshKey?: number; onTareaCreada?: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [tareaId, setTareaId] = useState('');
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    Promise.all([apiClient.get<Ministro[]>('/api/personas'), apiClient.get<Tarea[]>('/api/tareas')])
      .then(([personas, servicios]) => {
        if (!vigente) return;
        setMinistros(personas.data);
        setTareas(servicios.data);
        setSeleccionados([]);
      })
      .catch(() => { if (vigente) setError('No se pudieron cargar las tareas y los ministros.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [refreshKey, intento]);

  const existente = tareas.find(tarea => String(tarea.id) === tareaId);
  const dia = existente?.fecha.split('T')[0] ?? fecha;
  const inicio = existente?.hora_inicio.slice(0, 5) ?? horaInicio;
  const fin = existente?.hora_fin.slice(0, 5) ?? horaFin;
  const yaAsignados = existente?.asignados.map(asignado => asignado.persona_id) ?? [];
  const avisos = ministros.filter(ministro => seleccionados.includes(ministro.id)).map(ministro => {
    const otros = tareas.filter(tarea => tarea.id !== existente?.id && tarea.asignados.some(a => a.persona_id === ministro.id));
    const conflictos = dia && inicio && fin ? otros.filter(tarea => tarea.fecha.split('T')[0] === dia
      && tarea.hora_inicio.slice(0, 5) < fin && tarea.hora_fin.slice(0, 5) > inicio) : [];
    const servicios = otros.filter(tarea => tarea.fecha.slice(0, 7) === dia.slice(0, 7)).length + 1;
    return { ministro, conflictos, servicios };
  });
  const hayConflicto = avisos.some(aviso => aviso.conflictos.length > 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (guardando) return;
    if ((!tareaId && (!titulo.trim() || !descripcion.trim() || !fecha || !horaInicio || !horaFin)) || !seleccionados.length) {
      toast.error('Faltan datos', 'Completa los datos de la tarea y selecciona al menos un ministro.');
      return;
    }
    if (inicio >= fin) {
      toast.error('Horario inválido', 'La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    if (hayConflicto) {
      toast.error('Conflicto de horario', 'Revisa los ministros seleccionados antes de guardar.');
      return;
    }
    setGuardando(true);
    try {
      if (tareaId) await apiClient.post('/api/tareas/asignar', { tarea_id: Number(tareaId), persona_ids: seleccionados });
      else await apiClient.post('/api/tareas', {
        titulo: titulo.trim(), descripcion: descripcion.trim(), fecha,
        hora_inicio: horaInicio, hora_fin: horaFin, persona_ids: seleccionados,
      });
      toast.success(tareaId ? 'Tarea asignada' : 'Tarea creada y asignada', 'Las asignaciones se guardaron correctamente.');
      setTitulo(''); setDescripcion(''); setFecha(''); setHoraInicio(''); setHoraFin('');
      setTareaId(''); setSeleccionados([]);
      onTareaCreada?.();
    } catch (error: unknown) {
      toast.error('No se pudo guardar la tarea', getApiErrorMessage(error, 'Error de red al intentar guardar la tarea.'));
    } finally { setGuardando(false); }
  };

  if (cargando) return <LoadingState label="Cargando tareas y ministros..." />;
  if (error) return <ErrorState message={error} onRetry={() => setIntento(valor => valor + 1)} />;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={local.fields} disabled={guardando}>
        <div className={styles.field}>
          <label htmlFor="tarea" className={styles.label}>Tarea</label>
          <select id="tarea" className={styles.input} value={tareaId} onChange={e => { setTareaId(e.target.value); setSeleccionados([]); }}>
            <option value="">Crear una nueva tarea</option>
            {tareas.map(tarea => <option key={tarea.id} value={tarea.id}>{tarea.titulo} · {tarea.fecha.split('T')[0]} · {tarea.hora_inicio.slice(0, 5)}</option>)}
          </select>
        </div>
        {!tareaId && <>
          <div className={styles.field}>
            <label htmlFor="titulo" className={styles.label}>Título:</label>
            <input id="titulo" className={styles.input} value={titulo} maxLength={255} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Lectura primera" />
          </div>
          <div className={styles.field}>
            <label htmlFor="descripcion" className={styles.label}>Descripción:</label>
            <input id="descripcion" className={styles.input} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej. Preparar la celebración" />
          </div>
          <div className={styles.field}>
            <label htmlFor="fecha" className={styles.label}>Fecha:</label>
            <input type="date" id="fecha" className={styles.input} value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="hora_inicio" className={styles.label}>Hora de Inicio:</label>
              <input type="time" id="hora_inicio" className={styles.input} value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="hora_fin" className={styles.label}>Hora de Fin:</label>
              <input type="time" id="hora_fin" className={styles.input} value={horaFin} onChange={e => setHoraFin(e.target.value)} />
            </div>
          </div>
        </>}
        {existente && <p>{existente.descripcion} · {dia} · {inicio}–{fin}</p>}
        <fieldset className={local.ministros}>
          <legend className={styles.label}>Ministros ({seleccionados.length} seleccionados)</legend>
          {!ministros.length && <p>No hay ministros disponibles en tu directorio para asignar.</p>}
          {ministros.map(ministro => <label key={ministro.id} className={local.option}>
            <input type="checkbox" checked={seleccionados.includes(ministro.id) || yaAsignados.includes(ministro.id)} disabled={yaAsignados.includes(ministro.id)}
              onChange={event => setSeleccionados(actual => event.target.checked ? [...actual, ministro.id] : actual.filter(id => id !== ministro.id))} />
            <span>{ministro.nombre}{yaAsignados.includes(ministro.id) ? ' (ya asignado)' : ''}</span>
          </label>)}
        </fieldset>
        {avisos.map(({ ministro, conflictos, servicios }) => (
          (conflictos.length > 0 || !ministro.disponible || (dia && servicios > TOPE_SERVICIOS_MES)) &&
          <div key={ministro.id} className={styles.modalWarning}>
            <strong>{ministro.nombre}</strong>
            <ul className={styles.conflictList}>
              {conflictos.length > 0 && <li>Conflicto de horario: {conflictos.map(tarea => tarea.titulo).join(', ')}.</li>}
              {!ministro.disponible && <li>Está marcado como no disponible.</li>}
              {dia && servicios > TOPE_SERVICIOS_MES && <li>Tendría {servicios} servicios este mes (tope: {TOPE_SERVICIOS_MES}).</li>}
            </ul>
          </div>
        ))}
        <button type="submit" className="btn-primary" disabled={!ministros.length}>
          {guardando ? 'Guardando...' : tareaId ? 'Guardar Asignación' : 'Crear y asignar tarea'}
        </button>
      </fieldset>
    </form>
  );
}
