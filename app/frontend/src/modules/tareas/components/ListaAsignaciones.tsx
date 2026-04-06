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

export default function ListaAsignaciones() {
  // Estados para manejar los datos, la carga y los errores
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // useEffect que hace la petición a la API cuando se carga el componente
  useEffect(() => {
    // CÓDIGO PARA CONECTAR AL BACKEND DESCOMENTAR CUANDO SE TENGAN LOS ENDPOINTS
    /*
    fetch('http://localhost:3001/api/asignaciones') // VERIFICAR RUTA DEL ENDPOINT
      .then((res) => {
        if (!res.ok) throw new Error('Error al obtener los datos');
        return res.json();
      })
      .then((data) => {
        setAsignaciones(data);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
    */

    // DATOS SIMULADOS PARA PRUEBAS (ELIMINAR CUANDO SE TENGAN LOS ENDPOINTS)
    setTimeout(() => {
      setAsignaciones([
        {
          tarea_id: 1,
          persona_id: 1,
          descripcion_tarea: 'Limpieza del altar',
          fecha: '2026-03-20',
          hora_inicio: '08:00:00',
          hora_fin: '10:00:00',
          nombre_persona: 'Diego Calderón'
        },
        {
          tarea_id: 2,
          persona_id: 2,
          descripcion_tarea: 'Lectura de salmos',
          fecha: '2026-03-21',
          hora_inicio: '09:00:00',
          hora_fin: '09:30:00',
          nombre_persona: 'Pedro Caso'
        }
      ]);
      setCargando(false);
    }, 1000); // Simula un retraso de red de 1 segundo
  }, []);

  // Renderizado condicional para estados de carga y error
  if (cargando) return <p style={{ textAlign: 'center' }}>Cargando asignaciones...</p>;
  if (error) return <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>;

  // Interfaz Visual
  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
        Asignaciones Actuales
      </h2>
      
      {asignaciones.length === 0 ? (
        <p>No hay tareas asignadas en este momento.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#0056b3', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Tarea</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Ministro Asignado</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Horario</th>
            </tr>
          </thead>
          <tbody>
            {asignaciones.map((asignacion) => (
              <tr 
                // Usa una combinación de IDs como Key única ya que es una tabla compuesta
                key={`${asignacion.tarea_id}-${asignacion.persona_id}`} 
                style={{ borderBottom: '1px solid #ddd', backgroundColor: '#fff' }}
              >
                <td style={{ padding: '12px' }}>{asignacion.descripcion_tarea}</td>
                <td style={{ padding: '12px' }}><strong>{asignacion.nombre_persona}</strong></td>
                <td style={{ padding: '12px' }}>{asignacion.fecha}</td>
                <td style={{ padding: '12px' }}>
                  {asignacion.hora_inicio} - {asignacion.hora_fin}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}