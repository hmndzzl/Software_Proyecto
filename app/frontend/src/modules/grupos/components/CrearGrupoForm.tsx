import { useState, useEffect } from 'react';
import { Persona } from '../../../types';
import apiClient from '../../../api/client';

export default function CrearGrupoForm({ onGrupoCreado }: { onGrupoCreado?: () => void }) {
  const [nombre, setNombre] = useState('');
  const [coordinadorId, setCoordinadorId] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    apiClient.get('/api/personas/coordinadores-grupo')
      .then(res => setPersonas(res.data))
      .catch(() => setMensaje('Error al cargar la lista de coordinadores.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !coordinadorId) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.post('/api/grupos', { nombre, coordinador_id: parseInt(coordinadorId) });
      setMensaje('¡Grupo creado con éxito!');
      setNombre('');
      setCoordinadorId('');
      if (onGrupoCreado) onGrupoCreado();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar crear el grupo.');
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Crear Nuevo Grupo</h3>

      {mensaje && (
        <p
          className={mensaje.includes('éxito') ? '' : 'error-text'}
          style={{ color: mensaje.includes('éxito') ? '#2e7d32' : undefined, marginBottom: '16px', fontWeight: 600 }}
        >
          {mensaje}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="nombre" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Nombre del Grupo:
          </label>
          <input
            type="text"
            id="nombre"
            className="login-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ paddingLeft: '14px' }}
            placeholder="Ej. Coro Parroquial"
          />
        </div>

        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="coordinador" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Coordinador:
          </label>
          <select
            id="coordinador"
            className="login-input"
            value={coordinadorId}
            onChange={(e) => setCoordinadorId(e.target.value)}
            style={{ paddingLeft: '14px' }}
          >
            <option value="">-- Elige un coordinador --</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '16px' }}>
          Crear Grupo
        </button>
      </form>
    </div>
  );
}
