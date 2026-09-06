import { useState, useEffect } from 'react';
import apiClient from '../../../api/client';
import Btn from '../../../components/ui/Btn';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import SortableTh from '../../../components/ui/SortableTh';
import { useSortableTable } from '../../../hooks/useSortableTable';
import { ROLES } from '../../../utils/roles';
import { formatFecha, formatHora } from '../../../utils/date';
import styles from './ListaAsignaciones.module.css';
import formStyles from '../../../styles/Form.module.css';

interface Asignacion {
  tarea_id: number;
  persona_id: number;
  descripcion_tarea: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  nombre_persona: string;
}

interface MinistroOpcion {
  id: number;
  nombre: string;
}

type SortKey = 'tarea' | 'responsable' | 'fecha' | 'horario';

const SORT_VALUE: Record<SortKey, (a: Asignacion) => string> = {
  tarea: (a) => a.descripcion_tarea.toLowerCase(),
  responsable: (a) => a.nombre_persona.toLowerCase(),
  fecha: (a) => `${a.fecha} ${a.hora_inicio}`,
  horario: (a) => a.hora_inicio,
};

export default function ListaAsignaciones({ refreshKey }: { refreshKey?: number }) {
  const usuarioInfo = localStorage.getItem('usuario');
  const usuario = usuarioInfo ? JSON.parse(usuarioInfo) : null;
  const esMinistro = usuario?.rol_id === ROLES.MINISTRO;

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [ministros, setMinistros] = useState<MinistroOpcion[]>([]);
  const [editandoKey, setEditandoKey] = useState<string | null>(null);
  const [reasignando, setReasignando] = useState(false);
  const [aviso, setAviso] = useState('');

  const [editandoTarea, setEditandoTarea] = useState<Asignacion | null>(null);
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editHoraInicio, setEditHoraInicio] = useState('');
  const [editHoraFin, setEditHoraFin] = useState('');
  const [editMensaje, setEditMensaje] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const { sortKey, sortDir, toggleSort, sortedData: asignacionesOrdenadas } = useSortableTable(asignaciones, SORT_VALUE);

  useEffect(() => {
    if (esMinistro) return;
    apiClient.get('/api/personas').then(res => setMinistros(res.data)).catch(() => {});
  }, [esMinistro]);

  const cargarAsignaciones = () => {
    setCargando(true);
    setError('');
    const params = esMinistro && usuario ? { persona_id: usuario.id } : undefined;
    apiClient.get('/api/tareas', { params })
      .then((res) => {
        const asignacionesFormateadas: Asignacion[] = res.data.flatMap((tarea: any) =>
          tarea.asignados.map((asignado: any) => ({
            tarea_id: tarea.id,
            persona_id: asignado.persona_id,
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

  const reasignar = async (tareaId: number, personaActualId: number, personaNuevaId: number) => {
    setReasignando(true);
    setAviso('');
    try {
      const res = await apiClient.put('/api/tareas/asignar', {
        tarea_id: tareaId,
        persona_actual_id: personaActualId,
        persona_nueva_id: personaNuevaId,
      });
      const alerta = res.data.alerta;
      const avisos: string[] = [];
      if (alerta?.ministro_no_disponible) avisos.push('está marcado como no disponible');
      if (alerta?.tope_servicios_superado) avisos.push(`tendría ${alerta.servicios_en_el_mes} servicios este mes (tope: ${alerta.tope_servicios_mes})`);
      setAviso(avisos.length > 0 ? `Responsable actualizado. Atención: ${avisos.join(' y ')}.` : 'Responsable actualizado correctamente.');
      setEditandoKey(null);
      cargarAsignaciones();
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al reasignar la tarea');
    } finally {
      setReasignando(false);
    }
  };

  const abrirEdicionTarea = (asignacion: Asignacion) => {
    setEditandoTarea(asignacion);
    setEditDescripcion(asignacion.descripcion_tarea);
    setEditFecha(asignacion.fecha);
    setEditHoraInicio(asignacion.hora_inicio.substring(0, 5));
    setEditHoraFin(asignacion.hora_fin.substring(0, 5));
    setEditMensaje('');
  };

  const cerrarEdicionTarea = () => {
    setEditandoTarea(null);
    setEditMensaje('');
  };

  const guardarEdicionTarea = async () => {
    if (!editandoTarea) return;
    if (!editFecha || !editHoraInicio || !editHoraFin || !editDescripcion) {
      setEditMensaje('Por favor completa todos los campos.');
      return;
    }
    if (editHoraInicio >= editHoraFin) {
      setEditMensaje('La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    setEditLoading(true);
    setEditMensaje('');
    try {
      await apiClient.put(`/api/tareas/${editandoTarea.tarea_id}`, {
        fecha: editFecha,
        hora_inicio: editHoraInicio,
        hora_fin: editHoraFin,
        descripcion: editDescripcion,
      });
      cerrarEdicionTarea();
      cargarAsignaciones();
    } catch (err: any) {
      setEditMensaje(err.response?.data?.mensaje || 'Error al guardar los cambios.');
    } finally {
      setEditLoading(false);
    }
  };

  if (cargando) return <LoadingState label="Cargando asignaciones..." />;
  if (error)    return <ErrorState message={error} onRetry={cargarAsignaciones} />;

  return (
    <div>
      <h3 className={styles.seccionTitulo}>{esMinistro ? 'Mis Tareas' : 'Asignaciones Actuales'}</h3>

      {editandoTarea && (
        <div className={formStyles.modalOverlay}>
          <div className={formStyles.modalCard}>
            <h4 className={formStyles.modalTitle}>Editar Tarea #{editandoTarea.tarea_id}</h4>

            {editMensaje && (
              <p className={`${formStyles.message} ${formStyles.messageError}`}>{editMensaje}</p>
            )}

            <div className={formStyles.form}>
              <div className={formStyles.field}>
                <label className={`${formStyles.label} ${formStyles.required}`}>Descripción:</label>
                <input type="text" className={formStyles.input} value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} />
              </div>

              <div className={formStyles.field}>
                <label className={`${formStyles.label} ${formStyles.required}`}>Fecha:</label>
                <input type="date" className={formStyles.input} value={editFecha} onChange={e => setEditFecha(e.target.value)} />
              </div>

              <div className={formStyles.fieldRow}>
                <div className={formStyles.field}>
                  <label className={`${formStyles.label} ${formStyles.required}`}>Hora de Inicio:</label>
                  <input type="time" className={formStyles.input} value={editHoraInicio} onChange={e => setEditHoraInicio(e.target.value)} />
                </div>
                <div className={formStyles.field}>
                  <label className={`${formStyles.label} ${formStyles.required}`}>Hora de Fin:</label>
                  <input type="time" className={formStyles.input} value={editHoraFin} onChange={e => setEditHoraFin(e.target.value)} />
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

      {!esMinistro && aviso && <p className={styles.aviso}>{aviso}</p>}

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
                {!esMinistro && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {asignacionesOrdenadas.map((asignacion) => {
                const key = `${asignacion.tarea_id}-${asignacion.persona_id}`;
                return (
                  <tr key={key}>
                    <td>{asignacion.descripcion_tarea}</td>
                    {!esMinistro && (
                      <td>
                        {editandoKey === key ? (
                          <select
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
                    <td>{formatHora(asignacion.hora_inicio)} - {formatHora(asignacion.hora_fin)}</td>
                    {!esMinistro && (
                      <td>
                        <Btn kind="ghost" size="sm" onClick={() => abrirEdicionTarea(asignacion)}>
                          Editar
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
