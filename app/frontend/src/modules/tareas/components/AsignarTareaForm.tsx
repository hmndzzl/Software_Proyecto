import { useState, useEffect } from 'react';
import apiClient from '../../../api/client';

// Definir las interfaces para los datos del backend
interface Tarea {
  id: number;
  descripcion: string;
}

interface Persona {
  id: number;
  nombre: string;
}

export default function AsignarTareaForm({ refreshKey, onAsignacionExitosa }: { refreshKey?: number, onAsignacionExitosa?: () => void }) {
  // Estados para guardar las listas del backend
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Estados para guardar las selecciones del usuario en el formulario
  const [tareaSeleccionada, setTareaSeleccionada] = useState<string>('');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');

  useEffect(() => {
    // Petición al endpoint de tareas
    apiClient.get('/api/tareas')
      .then(res => setTareas(res.data))
      .catch(error => console.error(error));

    // Petición al endpoint de personas
    apiClient.get('/api/personas')
      .then(res => setPersonas(res.data))
      .catch(error => console.error(error));
  }, [refreshKey]);

  // Función del botón  "Asignar"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página se recargue

    if (!tareaSeleccionada || !personaSeleccionada) {
      setMensaje('Por favor, selecciona una tarea y un ministro.');
      return;
    }

    try {
      // Enviar la asignación al backend
      await apiClient.post('/api/tareas/asignar', {
        tarea_id: parseInt(tareaSeleccionada),
        persona_id: parseInt(personaSeleccionada)
      });
      setMensaje('¡Asignación guardada con éxito!');
      // Limpiar formulario después de guardar exitosamente
      setTareaSeleccionada('');
      setPersonaSeleccionada('');
      if (onAsignacionExitosa) onAsignacionExitosa();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Hubo un error de red al intentar guardar la asignación.');
    }
  };

  // Interfaz visual (JSX)
  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Asignar Tarea a Ministro</h3>
      
      {mensaje && <p className={mensaje.includes('éxito') ? '' : 'error-text'} style={{ color: mensaje.includes('éxito') ? '#2e7d32' : undefined, marginBottom: '16px', fontWeight: 600 }}>{mensaje}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Selector de Tareas */}
        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="tarea" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Seleccionar Tarea:</label>
          <select 
            id="tarea" 
            className="login-input"
            value={tareaSeleccionada} 
            onChange={(e) => setTareaSeleccionada(e.target.value)}
            style={{ paddingLeft: '14px' }}
          >
            <option value="">-- Elige una tarea --</option>
            {tareas.map((tarea) => (
              <option key={tarea.id} value={tarea.id}>
                {tarea.descripcion}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Personas (Ministros) */}
        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="persona" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Seleccionar Ministro:</label>
          <select 
            id="persona" 
            className="login-input"
            value={personaSeleccionada} 
            onChange={(e) => setPersonaSeleccionada(e.target.value)}
            style={{ paddingLeft: '14px' }}
          >
            <option value="">-- Elige un ministro --</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.nombre}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '16px' }}>
          Guardar Asignación
        </button>
      </form>
    </div>
  );
}