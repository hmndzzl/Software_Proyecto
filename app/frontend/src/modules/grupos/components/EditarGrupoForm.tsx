import { useState, useEffect } from 'react';
import { Grupo, Persona } from '../../../types';

export default function EditarGrupoForm({
  grupo,
  onGrupoActualizado,
  onCancelar
}: {
  grupo: Grupo;
  onGrupoActualizado?: () => void;
  onCancelar?: () => void;
}) {
  const [nombre, setNombre] = useState(grupo.nombre);
  const [coordinadorId, setCoordinadorId] = useState(String(grupo.coordinador_id));
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    setNombre(grupo.nombre);
    setCoordinadorId(String(grupo.coordinador_id));
    setMensaje('');
  }, [grupo]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL}/api/personas/coordinadores-grupo`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar coordinadores');
        return res.json();
      })
      .then(data => setPersonas(data))
      .catch(() => setMensaje('Error al cargar la lista de coordinadores.'));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !coordinadorId) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grupos/${grupo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, coordinador_id: parseInt(coordinadorId) })
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje('¡Grupo actualizado con éxito!');
        if (onGrupoActualizado) onGrupoActualizado();
      } else {
        setMensaje(data.mensaje || 'Error al actualizar el grupo.');
      }
    } catch {
      setMensaje('Error de red al intentar actualizar el grupo.');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el grupo "${grupo.nombre}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grupos/${grupo.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        if (onGrupoActualizado) onGrupoActualizado();
      } else {
        const data = await response.json();
        setMensaje(data.mensaje || 'Error al eliminar el grupo.');
      }
    } catch {
      setMensaje('Error de red al intentar eliminar el grupo.');
    }
  };

  return (
    <div style={{ borderTop: '1px solid #eee', paddingTop: '24px', marginTop: '8px' }}>
      <h3 style={{ marginBottom: '16px' }}>Editar Grupo</h3>

      {mensaje && (
        <p
          className={mensaje.includes('éxito') ? '' : 'error-text'}
          style={{ color: mensaje.includes('éxito') ? '#2e7d32' : undefined, marginBottom: '16px', fontWeight: 600 }}
        >
          {mensaje}
        </p>
      )}

      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="edit-nombre" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Nombre del Grupo:
          </label>
          <input
            type="text"
            id="edit-nombre"
            className="login-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ paddingLeft: '14px' }}
          />
        </div>

        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="edit-coordinador" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Coordinador:
          </label>
          <select
            id="edit-coordinador"
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

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button type="submit" className="btn-primary">
            Guardar Cambios
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              backgroundColor: '#fde8e8',
              border: '1px solid #c0392b',
              borderRadius: '50px',
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              color: '#c0392b'
            }}
          >
            Eliminar
          </button>
          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #ccc',
                borderRadius: '50px',
                padding: '12px 20px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                color: '#333'
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
