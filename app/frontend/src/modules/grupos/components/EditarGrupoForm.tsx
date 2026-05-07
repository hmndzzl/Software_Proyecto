import { useState, useEffect } from 'react';
import { Grupo, Persona } from '../../../types';
import apiClient from '../../../api/client';

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
    apiClient.get('/api/personas/coordinadores-grupo')
      .then(res => setPersonas(res.data))
      .catch(() => setMensaje('Error al cargar la lista de coordinadores.'));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !coordinadorId) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.put(`/api/grupos/${grupo.id}`, { nombre, coordinador_id: parseInt(coordinadorId) });
      setMensaje('¡Grupo actualizado con éxito!');
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar actualizar el grupo.');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el grupo "${grupo.nombre}"?`)) return;

    try {
      await apiClient.delete(`/api/grupos/${grupo.id}`);
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar eliminar el grupo.');
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
