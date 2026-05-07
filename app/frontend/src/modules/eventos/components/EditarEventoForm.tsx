import { useState, useEffect } from 'react';
import { Evento } from '../../../types';

const BASE = import.meta.env.VITE_API_URL;

export default function EditarEventoForm({
  evento,
  onEventoActualizado,
  onCancelar,
}: {
  evento: Evento;
  onEventoActualizado?: () => void;
  onCancelar?: () => void;
}) {
  const [descripcion, setDescripcion] = useState(evento.descripcion);
  const [mensaje, setMensaje]         = useState('');

  useEffect(() => {
    setDescripcion(evento.descripcion);
    setMensaje('');
  }, [evento]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion) {
      setMensaje('La descripción no puede estar vacía.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE}/api/eventos/${evento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ descripcion }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje('¡Evento actualizado con éxito!');
        if (onEventoActualizado) onEventoActualizado();
      } else {
        setMensaje(data.mensaje || 'Error al actualizar el evento.');
      }
    } catch {
      setMensaje('Error de red al intentar actualizar el evento.');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el evento "${evento.descripcion}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE}/api/eventos/${evento.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        if (onEventoActualizado) onEventoActualizado();
      } else {
        const data = await response.json();
        setMensaje(data.mensaje || 'Error al eliminar el evento.');
      }
    } catch {
      setMensaje('Error de red al intentar eliminar el evento.');
    }
  };

  return (
    <div style={{ borderTop: '1px solid #eee', paddingTop: '24px', marginTop: '8px' }}>
      <h3 style={{ marginBottom: '16px' }}>Editar Evento</h3>

      {mensaje && (
        <p
          className={mensaje.includes('éxito') ? '' : 'error-text'}
          style={{ color: mensaje.includes('éxito') ? '#2e7d32' : undefined, marginBottom: '16px', fontWeight: 600 }}
        >
          {mensaje}
        </p>
      )}

      {/* Encargado de solo lectura */}
      <div style={{ backgroundColor: '#f5f5f5', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' }}>
        <span style={{ fontWeight: 600, color: '#555' }}>Encargado: </span>
        <span style={{ color: '#111' }}>{evento.nombre_encargado}</span>
        <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>(solicitante de la reserva)</span>
      </div>

      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Descripción:
          </label>
          <input
            type="text"
            className="login-input"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            style={{ paddingLeft: '14px' }}
          />
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
              color: '#c0392b',
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
                color: '#333',
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
