import { useState, useEffect, useMemo } from 'react';
import apiClient from '../../../api/client';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import { ROLES } from '../../../utils/roles';
import formStyles from '../../../styles/Form.module.css';
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

export default function ListaAsignaciones({ refreshKey }: { refreshKey?: number }) {
  const usuarioInfo = localStorage.getItem('usuario');
  const usuario = usuarioInfo ? JSON.parse(usuarioInfo) : null;
  const esMinistro = usuario?.rol_id === ROLES.MINISTRO;

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroResponsable, setFiltroResponsable] = useState('');
  const [filtroHoraDesde, setFiltroHoraDesde] = useState('');
  const [filtroHoraHasta, setFiltroHoraHasta] = useState('');

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

  const responsables = useMemo(() => {
    const nombres = new Set(asignaciones.map(a => a.nombre_persona));
    return Array.from(nombres).sort();
  }, [asignaciones]);

  const asignacionesFiltradas = useMemo(() => {
    return asignaciones
      .filter(a => !filtroFechaDesde || a.fecha >= filtroFechaDesde)
      .filter(a => !filtroFechaHasta || a.fecha <= filtroFechaHasta)
      .filter(a => !filtroResponsable || a.nombre_persona === filtroResponsable)
      .filter(a => !filtroHoraDesde || a.hora_inicio.substring(0, 5) >= filtroHoraDesde)
      .filter(a => !filtroHoraHasta || a.hora_fin.substring(0, 5) <= filtroHoraHasta);
  }, [asignaciones, filtroFechaDesde, filtroFechaHasta, filtroResponsable, filtroHoraDesde, filtroHoraHasta]);

  const hayFiltrosActivos = !!(filtroFechaDesde || filtroFechaHasta || filtroResponsable || filtroHoraDesde || filtroHoraHasta);

  const limpiarFiltros = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroResponsable('');
    setFiltroHoraDesde('');
    setFiltroHoraHasta('');
  };

  if (cargando) return <LoadingState label="Cargando asignaciones..." />;
  if (error)    return <ErrorState message={error} onRetry={cargarAsignaciones} />;

  return (
    <div>
      <h3 className={styles.seccionTitulo}>{esMinistro ? 'Mis Tareas' : 'Asignaciones Actuales'}</h3>

      {!esMinistro && asignaciones.length > 0 && (
        <div className={styles.filtros}>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Desde:</label>
            <input type="date" className={formStyles.input} value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Hasta:</label>
            <input type="date" className={formStyles.input} value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Responsable:</label>
            <select className={formStyles.input} value={filtroResponsable} onChange={(e) => setFiltroResponsable(e.target.value)}>
              <option value="">Todos</option>
              {responsables.map((nombre) => (
                <option key={nombre} value={nombre}>{nombre}</option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Hora desde:</label>
            <input type="time" className={formStyles.input} value={filtroHoraDesde} onChange={(e) => setFiltroHoraDesde(e.target.value)} />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Hora hasta:</label>
            <input type="time" className={formStyles.input} value={filtroHoraHasta} onChange={(e) => setFiltroHoraHasta(e.target.value)} />
          </div>
          {hayFiltrosActivos && (
            <button type="button" className={formStyles.btnSecondary} onClick={limpiarFiltros}>Limpiar filtros</button>
          )}
        </div>
      )}

      {asignacionesFiltradas.length === 0 ? (
        <EmptyState message={
          esMinistro
            ? 'No tienes tareas asignadas en este momento.'
            : hayFiltrosActivos
              ? 'No hay asignaciones que coincidan con los filtros.'
              : 'No hay tareas asignadas en este momento.'
        } />
      ) : (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Tarea</th>
                {!esMinistro && <th>Ministro Asignado</th>}
                <th>Fecha</th>
                <th>Horario</th>
              </tr>
            </thead>
            <tbody>
              {asignacionesFiltradas.map((asignacion) => (
                <tr key={`${asignacion.tarea_id}-${asignacion.persona_id}`}>
                  <td>{asignacion.descripcion_tarea}</td>
                  {!esMinistro && <td><strong>{asignacion.nombre_persona}</strong></td>}
                  <td>{asignacion.fecha}</td>
                  <td>{asignacion.hora_inicio} - {asignacion.hora_fin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
