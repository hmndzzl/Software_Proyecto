import { useState, useEffect } from 'react';
import { ReservaDisponible } from '../../../types';
import apiClient from '../../../api/client';
import { formatFecha as fmt, formatHorario } from '../../../utils/date';
import styles from '../../../styles/Form.module.css';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

export default function CrearEventoForm({ onEventoCreado }: { onEventoCreado?: () => void }) {
  const [descripcion, setDescripcion]   = useState('');
  const [reservaId, setReservaId]       = useState('');
  const [reservas, setReservas]         = useState<ReservaDisponible[]>([]);
  const toast = useToast();

  const reservaSeleccionada = reservas.find(r => String(r.id) === reservaId) ?? null;

  useEffect(() => {
    apiClient.get<ReservaDisponible[]>('/api/eventos/reservas-disponibles')
      .then(r => setReservas(r.data))
      .catch(() => toast.error('No se pudieron cargar los datos', 'Error al cargar reservas disponibles.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion || !reservaId) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.post('/api/eventos', { descripcion, reserva_id: parseInt(reservaId) });
      toast.success('Evento creado', `El evento "${descripcion}" ya quedó registrado.`);
      setDescripcion('');
      setReservaId('');
      if (onEventoCreado) onEventoCreado();
    } catch (error: unknown) {
      toast.error('No se pudo crear el evento', getApiErrorMessage(error, 'Error de red al intentar crear el evento.'));
    }
  };

  return (
    <div>
      <h3 className={styles.sectionTitle}>Crear Nuevo Evento</h3>

      <form onSubmit={handleSubmit} className={styles.form}>
        <p className={styles.fieldNote}>Completa la descripción y elige una reserva confirmada que aún no tenga evento. El encargado será el solicitante de esa reserva.</p>
        <div className={styles.field}>
          <label htmlFor="evento-descripcion" className={styles.label}>Descripción:</label>
          <input
            id="evento-descripcion"
            type="text"
            className={styles.input}
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Ej. Misa de Navidad"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="evento-reserva" className={styles.label}>Reserva (confirmada, sin evento):</label>
          <select
            id="evento-reserva"
            className={styles.input}
            value={reservaId}
            onChange={e => setReservaId(e.target.value)}
          >
            <option value="">-- Elige una reserva --</option>
            {reservas.map(r => (
              <option key={r.id} value={r.id}>
                {fmt(r.fecha)} · {formatHorario(r.hora_inicio, r.hora_fin)} · {r.nombre_espacio ?? 'Sin espacio'}
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
