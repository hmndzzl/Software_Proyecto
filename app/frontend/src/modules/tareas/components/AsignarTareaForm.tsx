import { useState, useEffect } from 'react';

// Definir las interfaces para los datos del backend
interface Tarea {
  id: number;
  descripcion: string;
}

interface Persona {
  id: number;
  nombre: string;
}

export default function AsignarTareaForm() {
  // Estados para guardar las listas del backend
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Estados para guardar las selecciones del usuario en el formulario
  const [tareaSeleccionada, setTareaSeleccionada] = useState<string>('');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');

  // useEffect para cargar datos al iniciar el componente
  
  useEffect(() => {
    // ESPERANDO ENDPOINTS DEL BACKEND

    fetch('http://localhost:3001/api/tareas')
      .then(res => res.json())
      .then(data => setTareas(data));
      
    fetch('http://localhost:3001/api/personas')
      .then(res => res.json())
      .then(data => setPersonas(data));

    // DATOS SIMULADOS PARA PRUEBAS (ELIMINAR):
    setTareas([
      { id: 1, descripcion: 'Limpieza del altar' },
      { id: 2, descripcion: 'Lectura de salmos' }
    ]);
    setPersonas([
      { id: 1, nombre: 'Diego Calderón' },
      { id: 2, nombre: 'Pedro Caso' }
    ]);
  }, []);

  // Función del botón  "Asignar"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página se recargue

    if (!tareaSeleccionada || !personaSeleccionada) {
      setMensaje('Por favor, selecciona una tarea y un ministro.');
      return;
    }

    try { // Enviar datos al backend 
      
      const response = await fetch('http://localhost:3001/api/asignaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tarea_id: parseInt(tareaSeleccionada),
          persona_id: parseInt(personaSeleccionada)
        })
      });
      if (response.ok) setMensaje('¡Asignación guardada con éxito!');
      
      
      // SIMULACIÓN DE GUARDADO (ELIMINAR):
      console.log(`Asignando tarea ${tareaSeleccionada} a persona ${personaSeleccionada}`);
      setMensaje('¡Asignación guardada con éxito!');
      
      // Limpiar formulario
      setTareaSeleccionada('');
      setPersonaSeleccionada('');
      
    } catch (error) {
      setMensaje('Hubo un error al guardar la asignación.');
    }
  };

  // Interfaz visual (JSX)
  return (
    <div style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Asignar Tarea a Ministro</h2>
      
      {mensaje && <p style={{ color: mensaje.includes('éxito') ? 'green' : 'red' }}>{mensaje}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {Selector de Tareas}
        <div>
          <label htmlFor="tarea">Seleccionar Tarea:</label>
          <select 
            id="tarea" 
            value={tareaSeleccionada} 
            onChange={(e) => setTareaSeleccionada(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">-- Elige una tarea --</option>
            {tareas.map((tarea) => (
              <option key={tarea.id} value={tarea.id}>
                {tarea.descripcion}
              </option>
            ))}
          </select>
        </div>

        {Selector de Personas (Ministros)}
        <div>
          <label htmlFor="persona">Seleccionar Ministro:</label>
          <select 
            id="persona" 
            value={personaSeleccionada} 
            onChange={(e) => setPersonaSeleccionada(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">-- Elige un ministro --</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.nombre}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" style={{ padding: '10px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Guardar Asignación
        </button>
      </form>
    </div>
  );
}