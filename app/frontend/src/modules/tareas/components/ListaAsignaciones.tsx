import { useState, useEffect } from 'react';

// Combinación de la tabla 'tarea' y la tabla 'persona'
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
  // Estados para manejar los datos, la carga y los errores
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // useEffect que hace la petición a la API cuando se carga el componente
  useEffect(() => {
    const token = localStorage.getItem('token');
    // Petición al endpoint de tareas
    fetch(`${import.meta.env.VITE_API_URL}/api/tareas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) {
           // Si el token es inválido o no existe, el res.ok será false
           throw new Error('No autorizado o error al obtener los datos');
        }
        return res.json();
      })
      .then((data) => {
        // Transformar datos a estructura plana para tabla
        const asignacionesFormateadas: Asignacion[] = data.flatMap((tarea: any) => 
          tarea.asignados.map((asignado: any) => ({
            tarea_id: tarea.id,
            persona_id: asignado.persona_id,
            descripcion_tarea: tarea.descripcion,
            // Se Extrae solo la parte de la fecha (YYYY-MM-DD)
            fecha: tarea.fecha.split('T')[0], 
            hora_inicio: tarea.hora_inicio,
            hora_fin: tarea.hora_fin,
            nombre_persona: asignado.nombre
          }))
        );

        setAsignaciones(asignacionesFormateadas);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, [refreshKey]);

  // Renderizado condicional para estados de carga y error
  if (cargando) return <p style={{ textAlign: 'center' }}>Cargando asignaciones...</p>;
  if (error) return <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>;

  // Interfaz Visual
  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Asignaciones Actuales</h3>
      
      {asignaciones.length === 0 ? (
        <p>No hay tareas asignadas en este momento.</p>
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
                  <td>
                    {asignacion.hora_inicio} - {asignacion.hora_fin}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}