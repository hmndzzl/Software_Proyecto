import { useId, useState, useEffect } from 'react';
import apiClient from '../../../api/client';
import { useToast } from '../../../context/ToastContext';
import Btn from '../../../components/ui/Btn';
import { CardHead } from '../../../components/ui/Card';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import SortableTh from '../../../components/ui/SortableTh';
import TableFilters from '../../../components/ui/TableFilters';
import { useTableFilters } from '../../../hooks/useTableFilters';
import { useSortableTable } from '../../../hooks/useSortableTable';
import { useAuth } from '../../../context/AuthContext';
import { ROLES, rolTieneAcceso } from '../../../utils/roles';
import { formatFecha, formatHorario } from '../../../utils/date';
import type { Ministro, Tarea } from '../../../types';
import { getApiErrorMessage } from '../../../utils/apiError';
import styles from './ListaAsignaciones.module.css';
import formStyles from '../../../styles/Form.module.css';
import EventoTareaSelect from './EventoTareaSelect';

interface Asignacion {
  tarea_id: number;
  evento_id: number | null;
  persona_id: number;
  titulo_tarea: string;
  descripcion_tarea: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  nombre_persona: string;
}

interface AlertaReasignacion {
  ministro_no_disponible?: boolean;
  tope_servicios_superado?: boolean;
  servicios_en_el_mes?: number;
  tope_servicios_mes?: number;
}

interface RespuestaReasignacion {
  alerta?: AlertaReasignacion;
}

type MinistroOpcion = Ministro;

type SortKey = 'tarea' | 'responsable' | 'fecha' | 'horario';

const SORT_VALUE: Record<SortKey, (a: Asignacion) => string> = {
  tarea: (a) => a.titulo_tarea.toLowerCase(),
  responsable: (a) => a.nombre_persona.toLowerCase(),
  fecha: (a) => `${a.fecha} ${a.hora_inicio}`,
  horario: (a) => a.hora_inicio,
};

export default function ListaAsignaciones({ refreshKey, onCambio }: { refreshKey?: number; onCambio?: () => void }) {
  const fieldId = useId();
  const { usuario } = useAuth();
  const esMinistro = usuario?.rol_id === ROLES.MINISTRO;
  const puedeGestionar = rolTieneAcceso(usuario?.rol_id, [ROLES.COORDINADOR_MINISTROS]);

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [ministros, setMinistros] = useState<MinistroOpcion[]>([]);
  const [editandoKey, setEditandoKey] = useState<string | null>(null);
  const [reasignando, setReasignando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const toast = useToast();

  const [editandoTarea, setEditandoTarea] = useState<Asignacion | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editHoraInicio, setEditHoraInicio] = useState('');
  const [editHoraFin, setEditHoraFin] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editEventoId, setEditEventoId] = useState<number | null>(null);

  const filtros = useTableFilters(asignaciones, {
    search: a => [a.tarea_id, a.titulo_tarea, a.descripcion_tarea, a.nombre_persona], date: a => a.fecha,
    selects: esMinistro ? [] : [
      { key: 'ministro', label: 'Ministro', value: a => a.nombre_persona },
      { key: 'asignacion', label: 'Asignación', value: a => a.persona_id ? 'Con ministro' : 'Sin ministro' },
    ],
  });
  const { sortKey, sortDir, toggleSort, sortedData: asignacionesOrdenadas } = useSortableTable(filtros.filteredData, SORT_VALUE);

  useEffect(() => {
    if (!puedeGestionar) return;
    apiClient.get<Ministro[]>('/api/personas').then(res => setMinistros(res.data)).catch(() => {});
  }, [puedeGestionar]);

  const cargarAsignaciones = () => {
    setCargando(true);
    setError('');
    const params = esMinistro && usuario ? { persona_id: usuario.id } : undefined;
    apiClient.get<Tarea[]>('/api/tareas', { params })
      .then((res) => {
        const asignacionesFormateadas: Asignacion[] = res.data.flatMap((tarea) =>
          (tarea.asignados.length ? tarea.asignados : [{ persona_id: 0, nombre: 'Sin ministro asignado' }]).map((asignado) => ({
            tarea_id: tarea.id,
            evento_id: tarea.evento_id ?? null,
            persona_id: asignado.persona_id,
            titulo_tarea: tarea.titulo,
            descripcion_tarea: tarea.descripcion,
            fecha: tarea.fecha.split('T')[0],
            hora_inicio: tarea.hora_inicio,
            hora_fin: tarea.hora_fin,
            nombre_persona: asignado.nombre
          }))
        );
        setAsignaciones(asignacionesFormateadas);
        setCargando(false);
      })
      .catch(() => {
        setError('Error al obtener los datos');
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarAsignaciones();
  }, [refreshKey]);

  const refrescar = () => {
    if (onCambio) onCambio();
    else cargarAsignaciones();
  };

  const eliminar = async (asignacion: Asignacion, soloMinistro: boolean) => {
    if (eliminando) return;
    const confirmacion = soloMinistro
      ? `¿Quitar a ${asignacion.nombre_persona} de la tarea "${asignacion.titulo_tarea}"? La tarea y los demás ministros se conservarán.`
      : `¿Eliminar la tarea "${asignacion.titulo_tarea}" por completo? Se borrarán todas sus asignaciones y solicitudes de cambio de turno. Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmacion)) return;
    setEliminando(true);
    try {
      if (soloMinistro) await apiClient.delete('/api/tareas/asignar', { data: { tarea_id: asignacion.tarea_id, persona_id: asignacion.persona_id } });
      else await apiClient.delete(`/api/tareas/${asignacion.tarea_id}`);
      toast.success(soloMinistro ? 'Asignación eliminada' : 'Tarea eliminada', soloMinistro ? 'El ministro fue retirado de esta tarea.' : 'La tarea se eliminó por completo.');
      setEditandoKey(null);
      refrescar();
    } catch (error: unknown) {
      toast.error('No se pudo completar la acción', getApiErrorMessage(error, 'Error al eliminar. Inténtalo nuevamente.'));
    } finally { setEliminando(false); }
  };

  const reasignar = async (tareaId: number, personaActualId: number, personaNuevaId: number) => {
    setReasignando(true);
    try {
      const res = await apiClient.put<RespuestaReasignacion>('/api/tareas/asignar', {
        tarea_id: tareaId,
        persona_actual_id: personaActualId,
        persona_nueva_id: personaNuevaId,
      });
      const alerta = res.data.alerta;
      const avisos: string[] = [];
      if (alerta?.ministro_no_disponible) avisos.push('está marcado como no disponible');
      if (alerta?.tope_servicios_superado) avisos.push(`tendría ${alerta.servicios_en_el_mes} servicios este mes (tope: ${alerta.tope_servicios_mes})`);
      toast.success('Responsable actualizado', avisos.length > 0 ? `Atención: ${avisos.join(' y ')}.` : 'El cambio se guardó correctamente.');
      setEditandoKey(null);
      refrescar();
    } catch (err: unknown) {
      toast.error('No se pudo reasignar la tarea', getApiErrorMessage(err, 'Error al reasignar la tarea.'));
    } finally {
      setReasignando(false);
    }
  };

  const abrirEdicionTarea = (asignacion: Asignacion) => {
    setEditandoTarea(asignacion);
    setEditEventoId(asignacion.evento_id);
    setEditTitulo(asignacion.titulo_tarea);
    setEditDescripcion(asignacion.descripcion_tarea);
    setEditFecha(asignacion.fecha);
    setEditHoraInicio(asignacion.hora_inicio.substring(0, 5));
    setEditHoraFin(asignacion.hora_fin.substring(0, 5));
  };

  const cerrarEdicionTarea = () => {
    setEditandoTarea(null);
  };

  const guardarEdicionTarea = async () => {
    if (!editandoTarea) return;
    if (!editFecha || !editHoraInicio || !editHoraFin || !editTitulo || !editDescripcion) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }
    if (editHoraInicio >= editHoraFin) {
      toast.error('Horario inválido', 'La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    setEditLoading(true);
    try {
      await apiClient.put(`/api/tareas/${editandoTarea.tarea_id}`, {
        fecha: editFecha,
        hora_inicio: editHoraInicio,
        hora_fin: editHoraFin,
        titulo: editTitulo,
        evento_id: editEventoId,
        descripcion: editDescripcion,
      });
      toast.success('Tarea actualizada', `Los cambios en "${editTitulo}" se guardaron.`);
      cerrarEdicionTarea();
      refrescar();
    } catch (err: unknown) {
      toast.error('No se pudo actualizar la tarea', getApiErrorMessage(err, 'Error al guardar los cambios.'));
    } finally {
      setEditLoading(false);
    }
  };

  if (cargando) return <LoadingState label="Cargando asignaciones..." />;
  if (error)    return <ErrorState message={error} onRetry={cargarAsignaciones} />;

  return (
    <div>
      <CardHead title={esMinistro ? 'Mis Tareas' : 'Asignaciones Actuales'} />
      <TableFilters {...filtros.controls} label="Filtros de tareas" />

      {editandoTarea && (
        <div className={formStyles.modalOverlay}>
          <div className={formStyles.modalCard}>
            <h4 className={formStyles.modalTitle}>Editar Tarea #{editandoTarea.tarea_id}</h4>

            <div className={formStyles.form}>
              <EventoTareaSelect value={editEventoId} disabled={editLoading} onChange={(id, evento) => {
                setEditEventoId(id);
                if (evento) setEditFecha(evento.fecha.slice(0, 10));
              }} />
              <div className={formStyles.field}>
                <label htmlFor={`${fieldId}-titulo`} className={`${formStyles.label} ${formStyles.required}`}>Título:</label>
                <input id={`${fieldId}-titulo`} aria-required="true" type="text" className={formStyles.input} value={editTitulo} onChange={e => setEditTitulo(e.target.value)} />
              </div>

              <div className={formStyles.field}>
                <label htmlFor={`${fieldId}-descripcion`} className={`${formStyles.label} ${formStyles.required}`}>Descripción:</label>
                <input id={`${fieldId}-descripcion`} aria-required="true" type="text" className={formStyles.input} value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} />
              </div>

              <div className={formStyles.field}>
                <label htmlFor={`${fieldId}-fecha`} className={`${formStyles.label} ${formStyles.required}`}>Fecha:</label>
                <input id={`${fieldId}-fecha`} aria-required="true" type="date" className={formStyles.input} value={editFecha} onChange={e => setEditFecha(e.target.value)} />
              </div>

              <div className={formStyles.fieldRow}>
                <div className={formStyles.field}>
                  <label htmlFor={`${fieldId}-inicio`} className={`${formStyles.label} ${formStyles.required}`}>Hora de Inicio:</label>
                  <input id={`${fieldId}-inicio`} aria-required="true" type="time" className={formStyles.input} value={editHoraInicio} onChange={e => setEditHoraInicio(e.target.value)} />
                </div>
                <div className={formStyles.field}>
                  <label htmlFor={`${fieldId}-fin`} className={`${formStyles.label} ${formStyles.required}`}>Hora de Fin:</label>
                  <input id={`${fieldId}-fin`} aria-required="true" type="time" className={formStyles.input} value={editHoraFin} onChange={e => setEditHoraFin(e.target.value)} />
                </div>
              </div>
            </div>

            <div className={formStyles.modalActions}>
              <button className={formStyles.btnSecondary} onClick={cerrarEdicionTarea} disabled={editLoading}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarEdicionTarea} disabled={editLoading}>
                {editLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}


      {asignaciones.length === 0 ? (
        <EmptyState message={esMinistro ? 'No tienes tareas asignadas en este momento.' : 'No hay tareas asignadas en este momento.'} />
      ) : (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <SortableTh label="Tarea" sortKey="tarea" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                {!esMinistro && <SortableTh label="Ministro Asignado" sortKey="responsable" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />}
                <SortableTh label="Fecha" sortKey="fecha" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Horario" sortKey="horario" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                {puedeGestionar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {asignacionesOrdenadas.map((asignacion) => {
                const key = `${asignacion.tarea_id}-${asignacion.persona_id}`;
                return (
                  <tr key={key}>
                    <td>{asignacion.titulo_tarea}</td>
                    {!esMinistro && (
                      <td>
                        {!asignacion.persona_id || !puedeGestionar ? asignacion.nombre_persona : editandoKey === key ? (
                          <>
                            <label htmlFor={`${fieldId}-responsable-${key}`} className={styles.srOnly}>
                              Responsable de {asignacion.titulo_tarea}
                            </label>
                            <select
                              id={`${fieldId}-responsable-${key}`}
                              className={styles.reasignarSelect}
                              autoFocus
                              defaultValue={asignacion.persona_id}
                              disabled={reasignando}
                              onChange={(e) => reasignar(asignacion.tarea_id, asignacion.persona_id, Number(e.target.value))}
                              onBlur={() => setEditandoKey(null)}
                            >
                              {ministros.map((m) => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <button
                            type="button"
                            className={styles.btnReasignar}
                            onClick={() => setEditandoKey(key)}
                            title="Cambiar responsable"
                          >
                            <strong>{asignacion.nombre_persona}</strong>
                          </button>
                        )}
                      </td>
                    )}
                    <td>{formatFecha(asignacion.fecha)}</td>
                    <td>{formatHorario(asignacion.hora_inicio, asignacion.hora_fin)}</td>
                    {puedeGestionar && (
                      <td className={styles.acciones}>
                        <Btn kind="ghost" size="sm" onClick={() => abrirEdicionTarea(asignacion)}>
                          Editar
                        </Btn>
                        {asignacion.persona_id !== 0 && <Btn kind="ghost" size="sm" disabled={eliminando || reasignando} onClick={() => eliminar(asignacion, true)}>
                          Quitar ministro de esta tarea
                        </Btn>}
                        <Btn kind="bad" size="sm" disabled={eliminando || reasignando} onClick={() => eliminar(asignacion, false)}>
                          Eliminar tarea
                        </Btn>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
