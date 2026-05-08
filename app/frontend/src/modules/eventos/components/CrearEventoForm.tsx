import { useState, useEffect } from 'react';
import { ReservaDisponible } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';

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
      <h3 className={styles.sectionTitle}>Crear Nuevo Evento</h3>

      {mensaje && (
        <p className={`${styles.message} ${mensaje.includes('éxito') ? styles.messageSuccess : styles.messageError}`}>
          {mensaje}
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Descripción:</label>
          <input
            type="text"
            className={styles.input}
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Ej. Misa de Navidad"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Reserva (confirmada, sin evento):</label>
          <select
            className={styles.input}
            value={reservaId}
            onChange={e => setReservaId(e.target.value)}
          >
            <option value="">-- Elige una reserva --</option>
            {reservas.map(r => (
              <option key={r.id} value={r.id}>
                {fmt(r.fecha)} · {fmtH(r.hora_inicio)}–{fmtH(r.hora_fin)} · {r.nombre_espacio ?? 'Sin espacio'}
              </option>
            ))}
          </select>
          {reservas.length === 0 && (
            <p className={styles.fieldNote}>No hay reservas confirmadas disponibles.</p>
          )}
        </div>

        {reservaSeleccionada && (
          <div className={styles.infoBox}>
            <span className={styles.infoBoxLabel}>Encargado:</span>
            <span>{reservaSeleccionada.nombre_solicitante}</span>
            <span className={styles.infoBoxNote}>(solicitante de la reserva)</span>
          </div>
        )}

        <button type="submit" className="btn-primary">
          Crear Evento
        </button>
      </form>
    </div>
  );
}
