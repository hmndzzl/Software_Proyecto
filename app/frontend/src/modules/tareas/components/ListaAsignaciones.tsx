import { useState, useEffect, useMemo } from 'react';
import apiClient from '../../../api/client';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import { ROLES } from '../../../utils/roles';
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

type SortKey = 'tarea' | 'responsable' | 'fecha' | 'horario';
type SortDir = 'asc' | 'desc' | null;

const SORT_VALUE: Record<SortKey, (a: Asignacion) => string> = {
  tarea: (a) => a.descripcion_tarea.toLowerCase(),
  responsable: (a) => a.nombre_persona.toLowerCase(),
  fecha: (a) => `${a.fecha} ${a.hora_inicio}`,
  horario: (a) => a.hora_inicio,
};

// Icono de 3 estados: sin ordenar (flechas apagadas), descendente (flecha abajo), ascendente (flecha arriba)
function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'desc') {
    return (
      <svg className={styles.sortIconActivo} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" /><path d="m18 13-6 6-6-6" />
      </svg>
    );
  }
  if (dir === 'asc') {
    return (
      <svg className={styles.sortIconActivo} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" /><path d="m6 11 6-6 6 6" />
      </svg>
    );
  }
  return (
    <svg className={styles.sortIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
    </svg>
  );
}

export default function ListaAsignaciones({ refreshKey }: { refreshKey?: number }) {
  const usuarioInfo = localStorage.getItem('usuario');
  const usuario = usuarioInfo ? JSON.parse(usuarioInfo) : null;
  const esMinistro = usuario?.rol_id === ROLES.MINISTRO;

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

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

  // Ciclo de 3 estados por columna: sin ordenar -> descendente -> ascendente -> sin ordenar
  const alternarOrden = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
      return;
    }
    if (sortDir === 'desc') { setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortKey(null); setSortDir(null); return; }
    setSortDir('desc');
  };

  const asignacionesOrdenadas = useMemo(() => {
    if (!sortKey || !sortDir) return asignaciones;
    const getValor = SORT_VALUE[sortKey];
    const factor = sortDir === 'asc' ? 1 : -1;
    return [...asignaciones].sort((a, b) => getValor(a).localeCompare(getValor(b)) * factor);
  }, [asignaciones, sortKey, sortDir]);

  if (cargando) return <LoadingState label="Cargando asignaciones..." />;
  if (error)    return <ErrorState message={error} onRetry={cargarAsignaciones} />;

  const renderTh = (label: string, key: SortKey) => (
    <th className={styles.thOrdenable} onClick={() => alternarOrden(key)}>
      <span className={styles.thContenido}>
        {label}
        <SortIcon dir={sortKey === key ? sortDir : null} />
      </span>
    </th>
  );

  return (
    <div>
      <h3 className={styles.seccionTitulo}>{esMinistro ? 'Mis Tareas' : 'Asignaciones Actuales'}</h3>

      {asignaciones.length === 0 ? (
        <EmptyState message={esMinistro ? 'No tienes tareas asignadas en este momento.' : 'No hay tareas asignadas en este momento.'} />
      ) : (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                {renderTh('Tarea', 'tarea')}
                {!esMinistro && renderTh('Ministro Asignado', 'responsable')}
                {renderTh('Fecha', 'fecha')}
                {renderTh('Horario', 'horario')}
              </tr>
            </thead>
            <tbody>
              {asignacionesOrdenadas.map((asignacion) => (
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
