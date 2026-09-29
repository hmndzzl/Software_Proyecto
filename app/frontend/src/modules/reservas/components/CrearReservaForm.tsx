import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../api/client';
import { formatFecha } from '../../../utils/date';
import { ROLES, usuarioTieneRol } from '../../../utils/roles';
import styles from '../../../styles/Form.module.css';

interface Espacio {
  id: number;
  nombre: string;
  capacidad: number | null;
}

interface ReservaEnviada {
  espacio: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  titulo: string;
}

interface CrearReservaFormProps {
  onReservaCreada?: () => void;
  autoFocus?: boolean;
}

export default function CrearReservaForm({ onReservaCreada, autoFocus = false }: CrearReservaFormProps) {
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [espacioId, setEspacioId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [enviada, setEnviada] = useState<ReservaEnviada | null>(null);
  const [loading, setLoading] = useState(false);
  const espacioRef = useRef<HTMLSelectElement>(null);
  const confirmacionRef = useRef<HTMLDivElement>(null);
  // Sacerdote y Admin aprueban reservas: su propia solicitud también queda pendiente y la aprueban ellos.
  const puedeAprobar = usuarioTieneRol([ROLES.SACERDOTE]);

  useEffect(() => {
    if (!autoFocus) return;
    espacioRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    espacioRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    // 'start' + scroll-margin-top (Form.module.css) evita que la barra superior fija tape el título.
    if (enviada) confirmacionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [enviada]);

  useEffect(() => {
    const fetchEspacios = async () => {
      try {
        const response = await apiClient.get('/api/espacios');
        setEspacios(response.data);
      } catch {
        // silencioso, el select quedará vacío
      }
    };
    fetchEspacios();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviada(null);

    if (!fecha || !horaInicio || !horaFin || !espacioId || !titulo || !descripcion) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    if (horaInicio >= horaFin) {
      setMensaje('La hora de inicio debe ser menor que la hora de fin.');
      return;
    }

    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = String(ahora.getMonth() + 1).padStart(2, '0');
    const d = String(ahora.getDate()).padStart(2, '0');
    const hoyStr = `${y}-${m}-${d}`;

    const hh = String(ahora.getHours()).padStart(2, '0');
    const mm = String(ahora.getMinutes()).padStart(2, '0');
    const horaActualStr = `${hh}:${mm}`;

    const fechaSoloFecha = fecha.split('T')[0];

    if (fechaSoloFecha < hoyStr) {
      setMensaje('La fecha de la reserva no puede estar en el pasado.');
      return;
    }

    if (fechaSoloFecha === hoyStr && horaInicio < horaActualStr) {
      setMensaje('La hora de inicio no puede estar en el pasado.');
      return;
    }

    setLoading(true);
    setMensaje('');

    try {
      await apiClient.post('/api/reservas', {
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        espacio_id: Number(espacioId),
        titulo,
        descripcion
      });
      setEnviada({
        espacio: espacios.find(esp => esp.id === Number(espacioId))?.nombre ?? 'el espacio seleccionado',
        fecha,
        horaInicio,
        horaFin,
        titulo,
      });
      setFecha('');
      setHoraInicio('');
      setHoraFin('');
      setEspacioId('');
      setTitulo('');
      setDescripcion('');
      if (onReservaCreada) onReservaCreada();
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'Error de red al intentar crear la reserva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className={styles.sectionTitle}>Solicitar Reserva</h3>

      {enviada && (
        <div ref={confirmacionRef} className={styles.confirmBox} role="status" aria-live="polite">
          <p className={styles.confirmTitle}>✓ Solicitud enviada</p>
          <p className={styles.confirmText}>
            Tu reserva de <strong>{enviada.espacio}</strong> para «{enviada.titulo}» el{' '}
            <strong>{formatFecha(enviada.fecha)}</strong>, de {enviada.horaInicio} a {enviada.horaFin},
            quedó <strong>pendiente de aprobación</strong>{puedeAprobar ? '' : ' del sacerdote'}.
          </p>
          {puedeAprobar ? (
            <p className={styles.confirmText}>
              Todavía no está confirmada. Puedes aprobarla tú mismo en la lista de solicitudes de esta página.
            </p>
          ) : (
            <p className={styles.confirmText}>
              Todavía no está confirmada. Puedes revisar su estado en{' '}
              <Link to="/mis-reservas" className={styles.confirmLink}>Mis Reservas →</Link>
            </p>
          )}
        </div>
      )}

      {mensaje && (
        <p className={`${styles.message} ${styles.messageError}`} role="alert">
          {mensaje}
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="espacio_id" className={`${styles.label} ${styles.required}`}>Espacio:</label>
          <select
            ref={espacioRef}
            id="espacio_id"
            className={styles.input}
            value={espacioId}
            onChange={(e) => setEspacioId(e.target.value)}
          >
            <option value="">-- Selecciona un espacio --</option>
            {espacios.map((esp) => (
              <option key={esp.id} value={esp.id}>
                {esp.nombre}{esp.capacidad ? ` (cap. ${esp.capacidad})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="fecha" className={`${styles.label} ${styles.required}`}>Fecha:</label>
          <input
            type="date"
            id="fecha"
            className={styles.input}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="hora_inicio" className={`${styles.label} ${styles.required}`}>Hora de Inicio:</label>
            <input
              type="time"
              id="hora_inicio"
              className={styles.input}
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="hora_fin" className={`${styles.label} ${styles.required}`}>Hora de Fin:</label>
            <input
              type="time"
              id="hora_fin"
              className={styles.input}
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="titulo" className={`${styles.label} ${styles.required}`}>Título del Evento:</label>
          <input
            type="text"
            id="titulo"
            className={styles.input}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Misa del Día de la Madre"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="descripcion" className={`${styles.label} ${styles.required}`}>Descripción del Evento:</label>
          <input
            type="text"
            id="descripcion"
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Celebración en honor a la Virgen, con coro y procesión"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Enviando...' : 'Solicitar Reserva'}
        </button>
      </form>
    </div>
  );
}
