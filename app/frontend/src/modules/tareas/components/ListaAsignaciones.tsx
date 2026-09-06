import { useState, useEffect } from 'react';
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

export default function ListaAsignaciones({ refreshKey }: { refreshKey?: number }) {
  const usuarioInfo = localStorage.getItem('usuario');
  const usuario = usuarioInfo ? JSON.parse(usuarioInfo) : null;
  const esMinistro = usuario?.rol_id === ROLES.MINISTRO;

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

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

  if (cargando) return <LoadingState label="Cargando asignaciones..." />;
  if (error)    return <ErrorState message={error} onRetry={cargarAsignaciones} />;

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
                <th>Tarea</th>
                {!esMinistro && <th>Ministro Asignado</th>}
                <th>Fecha</th>
                <th>Horario</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((asignacion) => (
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
