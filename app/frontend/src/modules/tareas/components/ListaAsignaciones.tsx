import { useState, useEffect } from 'react';
import apiClient from '../../../api/client';
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
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    apiClient.get('/api/tareas')
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
  }, [refreshKey]);

  if (cargando) return <p className={styles.textoInfo}>Cargando asignaciones...</p>;
  if (error)    return <p className={styles.textoError}>Error: {error}</p>;

  return (
    <div>
      <h3 className={styles.seccionTitulo}>Asignaciones Actuales</h3>

      {asignaciones.length === 0 ? (
        <p className={styles.textoVacio}>No hay tareas asignadas en este momento.</p>
      ) : (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Ministro Asignado</th>
                <th>Fecha</th>
                <th>Horario</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((asignacion) => (
                <tr key={`${asignacion.tarea_id}-${asignacion.persona_id}`}>
                  <td>{asignacion.descripcion_tarea}</td>
                  <td><strong>{asignacion.nombre_persona}</strong></td>
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
