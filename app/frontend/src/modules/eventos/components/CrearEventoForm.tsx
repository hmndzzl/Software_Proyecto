import { useState, useEffect } from 'react';
import { ReservaDisponible } from '../../../types';
import apiClient from '../../../api/client';

const fmt  = (f: string) => { const [y,m,d] = f.split('T')[0].split('-'); return `${d}/${m}/${y}`; };
const fmtH = (h: string) => h.substring(0, 5);

export default function CrearEventoForm({ onEventoCreado }: { onEventoCreado?: () => void }) {
  const [descripcion, setDescripcion]   = useState('');
  const [reservaId, setReservaId]       = useState('');
  const [reservas, setReservas]         = useState<ReservaDisponible[]>([]);
  const [mensaje, setMensaje]           = useState('');

  const reservaSeleccionada = reservas.find(r => String(r.id) === reservaId) ?? null;

  useEffect(() => {
    apiClient.get('/api/eventos/reservas-disponibles')
      .then(r => setReservas(r.data))
      .catch(() => setMensaje('Error al cargar reservas disponibles.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion || !reservaId) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.post('/api/eventos', { descripcion, reserva_id: parseInt(reservaId) });
      setMensaje('¡Evento creado con éxito!');
      setDescripcion('');
      setReservaId('');
      if (onEventoCreado) onEventoCreado();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar crear el evento.');
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Crear Nuevo Evento</h3>

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
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Descripción:
          </label>
          <input
            type="text"
            className="login-input"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            style={{ paddingLeft: '14px' }}
            placeholder="Ej. Misa de Navidad"
          />
        </div>

        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Reserva (confirmada, sin evento):
          </label>
          <select
            className="login-input"
            value={reservaId}
            onChange={e => setReservaId(e.target.value)}
            style={{ paddingLeft: '14px' }}
          >
            <option value="">-- Elige una reserva --</option>
            {reservas.map(r => (
              <option key={r.id} value={r.id}>
                {fmt(r.fecha)} · {fmtH(r.hora_inicio)}–{fmtH(r.hora_fin)} · {r.nombre_espacio ?? 'Sin espacio'}
              </option>
            ))}
          </select>
          {reservas.length === 0 && (
            <p style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
              No hay reservas confirmadas disponibles.
            </p>
          )}
        </div>

        {/* Muestra automáticamente el encargado según la reserva elegida */}
        {reservaSeleccionada && (
          <div style={{ backgroundColor: '#f5f5f5', borderRadius: '12px', padding: '12px 16px', fontSize: '14px' }}>
            <span style={{ fontWeight: 600, color: '#555' }}>Encargado: </span>
            <span style={{ color: '#111' }}>{reservaSeleccionada.nombre_solicitante}</span>
            <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>(solicitante de la reserva)</span>
          </div>
        )}

        <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
          Crear Evento
        </button>
      </form>
    </div>
  );
}
