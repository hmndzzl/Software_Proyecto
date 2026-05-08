import { useState, useEffect } from 'react';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';

interface Tarea {
  id: number;
  descripcion: string;
}

interface Persona {
  id: number;
  nombre: string;
}

export default function AsignarTareaForm({ refreshKey, onAsignacionExitosa }: { refreshKey?: number, onAsignacionExitosa?: () => void }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<string>('');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');

  useEffect(() => {
    apiClient.get('/api/tareas')
      .then(res => setTareas(res.data))
      .catch(error => console.error(error));

    apiClient.get('/api/personas')
      .then(res => setPersonas(res.data))
      .catch(error => console.error(error));
  }, [refreshKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tareaSeleccionada || !personaSeleccionada) {
      setMensaje('Por favor, selecciona una tarea y un ministro.');
      return;
    }

    try {
      await apiClient.post('/api/tareas/asignar', {
        tarea_id: parseInt(tareaSeleccionada),
        persona_id: parseInt(personaSeleccionada)
      });
      setMensaje('¡Asignación guardada con éxito!');
      setTareaSeleccionada('');
      setPersonaSeleccionada('');
      if (onAsignacionExitosa) onAsignacionExitosa();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Hubo un error de red al intentar guardar la asignación.');
    }
  };

  return (
    <div>
      <h3 className={styles.sectionTitle}>Asignar Tarea a Ministro</h3>

      {mensaje && (
        <p className={`${styles.message} ${mensaje.includes('éxito') ? styles.messageSuccess : styles.messageError}`}>
          {mensaje}
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="tarea" className={`${styles.label} ${styles.required}`}>Seleccionar Tarea:</label>
          <select
            id="tarea"
            className={styles.input}
            value={tareaSeleccionada}
            onChange={(e) => setTareaSeleccionada(e.target.value)}
          >
            <option value="">-- Elige una tarea --</option>
            {tareas.map((tarea) => (
              <option key={tarea.id} value={tarea.id}>
                {tarea.descripcion}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="persona" className={`${styles.label} ${styles.required}`}>Seleccionar Ministro:</label>
          <select
            id="persona"
            className={styles.input}
            value={personaSeleccionada}
            onChange={(e) => setPersonaSeleccionada(e.target.value)}
          >
            <option value="">-- Elige un ministro --</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.nombre}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary">
          Guardar Asignación
        </button>
      </form>
    </div>
  );
}
