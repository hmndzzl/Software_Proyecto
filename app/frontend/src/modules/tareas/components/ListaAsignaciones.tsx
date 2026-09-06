import { useState, useEffect } from 'react';
import apiClient from '../../../api/client';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import SortableTh from '../../../components/ui/SortableTh';
import { useSortableTable } from '../../../hooks/useSortableTable';
import { ROLES } from '../../../utils/roles';
import { formatFecha, formatHora } from '../../../utils/date';
import styles from './ListaAsignaciones.module.css';

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

  if (cargando) return <LoadingState label="Cargando asignaciones..." />;
  if (error)    return <ErrorState message={error} onRetry={cargarAsignaciones} />;

  return (
    <div>
      <h3 className={styles.seccionTitulo}>{esMinistro ? 'Mis Tareas' : 'Asignaciones Actuales'}</h3>

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
