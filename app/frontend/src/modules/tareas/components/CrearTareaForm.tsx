import { useState } from 'react';
import apiClient from '../../../api/client';

export default function CrearTareaForm({ onTareaCreada }: { onTareaCreada?: () => void }) {
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion || !fecha || !horaInicio || !horaFin) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.post('/api/tareas', {
        descripcion,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin
      });
      setMensaje('¡Tarea creada con éxito!');
      setDescripcion('');
      setFecha('');
      setHoraInicio('');
      setHoraFin('');
      if (onTareaCreada) onTareaCreada();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar crear la tarea.');
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Crear Nueva Tarea</h3>
      
      {mensaje && <p className={mensaje.includes('éxito') ? '' : 'error-text'} style={{ color: mensaje.includes('éxito') ? '#2e7d32' : undefined, marginBottom: '16px', fontWeight: 600 }}>{mensaje}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="descripcion" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Descripción:</label>
          <input 
            type="text" 
            id="descripcion" 
            className="login-input"
            value={descripcion} 
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ paddingLeft: '14px' }}
            placeholder="Ej. Limpieza de altar"
          />
        </div>

        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="fecha" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Fecha:</label>
          <input 
            type="date" 
            id="fecha" 
            className="login-input"
            value={fecha} 
            onChange={(e) => setFecha(e.target.value)}
            style={{ paddingLeft: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <div className="input-wrapper" style={{ marginBottom: '0', flex: 1 }}>
            <label htmlFor="hora_inicio" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Hora de Inicio:</label>
            <input 
              type="time" 
              id="hora_inicio" 
              className="login-input"
              value={horaInicio} 
              onChange={(e) => setHoraInicio(e.target.value)}
              style={{ paddingLeft: '14px' }}
            />
          </div>

          <div className="input-wrapper" style={{ marginBottom: '0', flex: 1 }}>
            <label htmlFor="hora_fin" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Hora de Fin:</label>
            <input 
              type="time" 
              id="hora_fin" 
              className="login-input"
              value={horaFin} 
              onChange={(e) => setHoraFin(e.target.value)}
              style={{ paddingLeft: '14px' }}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '16px' }}>
          Crear Tarea
        </button>
      </form>
    </div>
  );
}
