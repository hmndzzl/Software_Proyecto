import { useState, useEffect } from 'react';
import { Persona } from '../../../types';

export default function CrearGrupoForm({ onGrupoCreado }: { onGrupoCreado?: () => void }) {
  const [nombre, setNombre] = useState('');
  const [coordinadorId, setCoordinadorId] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL}/api/personas`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setPersonas(data))
      .catch(() => setMensaje('Error al cargar la lista de coordinadores.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !coordinadorId) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grupos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, coordinador_id: parseInt(coordinadorId) })
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje('¡Grupo creado con éxito!');
        setNombre('');
        setCoordinadorId('');
        if (onGrupoCreado) onGrupoCreado();
      } else {
        setMensaje(data.mensaje || 'Error al crear el grupo.');
      }
    } catch {
      setMensaje('Error de red al intentar crear el grupo.');
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
