import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../api/client';
import { useToast } from '../../../context/ToastContext';
import { formatFecha, formatHorario } from '../../../utils/date';
import { ROLES } from '../../../utils/roles';
import { getApiErrorMessage } from '../../../utils/apiError';
import { useAuth } from '../../../context/AuthContext';
import type { Espacio } from '../../espacios/components/EspacioCard';
import AforoField, { errorAforo } from '../../../components/ui/AforoField';
import styles from '../../../styles/Form.module.css';

interface CrearReservaFormProps {
  onReservaCreada?: () => void;
  autoFocus?: boolean;
  espacioInicial?: string;
}

export default function CrearReservaForm({ onReservaCreada, autoFocus = false, espacioInicial }: CrearReservaFormProps) {
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [espacioId, setEspacioId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [publico, setPublico] = useState(false);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espaciosCargados, setEspaciosCargados] = useState(false);
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const espacioRef = useRef<HTMLSelectElement>(null);
  const fechaRef = useRef<HTMLInputElement>(null);
  // Sacerdote y Admin aprueban reservas: su propia solicitud también queda pendiente y la aprueban ellos.
  const { tieneRol } = useAuth();
  const puedeAprobar = tieneRol([ROLES.SACERDOTE]);
  const puedePublicar = tieneRol([ROLES.SACERDOTE, ROLES.ADMIN]);
  const espacioSeleccionado = espacios.find(esp => String(esp.id) === espacioId);

  useEffect(() => {
    if (!autoFocus) return;
    // Si viene de un QR, hay que esperar a saber si ese espacio existe antes de decidir el foco.
    if (espacioInicial && !espaciosCargados) return;
    const espacioResuelto = espacioInicial && espacios.some((esp) => String(esp.id) === espacioInicial);
    // Con el espacio ya resuelto, el salto útil es a la fecha; si no se pudo resolver, vuelve al selector.
    const campo = espacioResuelto ? fechaRef.current : espacioRef.current;
    campo?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    campo?.focus();
  }, [autoFocus, espacioInicial, espaciosCargados, espacios]);

  useEffect(() => {
    const fetchEspacios = async () => {
      try {
        const response = await apiClient.get<Espacio[]>('/api/espacios');
        setEspacios(response.data);
      } catch {
        // silencioso, el select quedará vacío
      } finally {
        setEspaciosCargados(true);
      }
    };
    fetchEspacios();
  }, []);

  // Preselecciona el espacio del QR solo si existe en el catálogo cargado del backend.
  useEffect(() => {
    if (!espacioInicial) return;
    if (espacios.some((esp) => String(esp.id) === espacioInicial)) {
      setEspacioId(espacioInicial);
    }
  }, [espacioInicial, espacios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!fecha || !horaInicio || !horaFin || !espacioId || !titulo.trim() || !descripcion.trim() || !cantidad) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }
    const errorCantidad = errorAforo(cantidad, espacioSeleccionado?.capacidad);
    if (errorCantidad) { toast.error('Revisa el aforo esperado', errorCantidad); return; }

    if (horaInicio >= horaFin) {
      toast.error('Horario inválido', 'La hora de inicio debe ser menor que la hora de fin.');
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
      toast.error('Fecha inválida', 'La fecha de la reserva no puede estar en el pasado.');
      return;
    }

    if (fechaSoloFecha === hoyStr && horaInicio < horaActualStr) {
      toast.error('Horario inválido', 'La hora de inicio no puede estar en el pasado.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/api/reservas', {
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        espacio_id: Number(espacioId),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        cantidad_personas: Number(cantidad),
        ...(puedePublicar ? { publico } : {}),
      });
      const nombreEspacio = espacios.find(esp => esp.id === Number(espacioId))?.nombre ?? 'el espacio seleccionado';
      toast.success(
        'Solicitud enviada',
        `Tu reserva de ${nombreEspacio} para «${titulo}» el ${formatFecha(fecha)}, ${formatHorario(horaInicio, horaFin)}, quedó pendiente de aprobación${puedeAprobar ? '' : ' del sacerdote'}. ` +
          (puedeAprobar
            ? 'Puedes aprobarla tú mismo en la lista de solicitudes de esta página.'
            : 'Puedes revisar su estado en Mis Reservas.')
      );
      setFecha('');
      setHoraInicio('');
      setHoraFin('');
      setEspacioId('');
      setTitulo('');
      setDescripcion('');
      setCantidad('');
      setPublico(false);
      if (onReservaCreada) onReservaCreada();
    } catch (error: unknown) {
      toast.error('No se pudo crear la reserva', getApiErrorMessage(error, 'Error de red al intentar crear la reserva.', 'message'));
    } finally {
      setLoading(false);
    }
  };

  // Solo mientras la selección siga siendo la que trajo el QR: si la persona la cambia a mano, se oculta.
  const nombreEspacioInicial = espacioId === espacioInicial
    ? espacios.find((esp) => String(esp.id) === espacioId)?.nombre
    : undefined;

  const espacioInicialNoEncontrado = Boolean(espacioInicial)
    && espaciosCargados
    && !espacios.some((esp) => String(esp.id) === espacioInicial);

  return (
    <div>


      {nombreEspacioInicial && (
        <div className={`${styles.infoBox} ${styles.infoBoxMargin}`}>
          <span className={styles.infoBoxLabel}>Espacio seleccionado:</span>
          {nombreEspacioInicial}
        </div>
      )}

      {espacioInicialNoEncontrado && (
        <div className={`${styles.warningBox} ${styles.infoBoxMargin}`}>
          El espacio del enlace ya no está disponible. Selecciona uno manualmente.
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <p className={styles.fieldNote}>Selecciona el espacio, indica cuántas personas asistirán y completa la fecha, el horario y los datos de la actividad. La solicitud quedará pendiente de aprobación.</p>
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
          {espacioId && (
            <Link to={`/espacios/${espacioId}`} className={styles.espacioDetalleLink}>
              Ver detalle del espacio
            </Link>
          )}
        </div>

        <AforoField value={cantidad} onChange={setCantidad} capacidad={espacioSeleccionado ? espacioSeleccionado.capacidad ?? null : undefined} />
        <div className={styles.field}>
          <label htmlFor="fecha" className={`${styles.label} ${styles.required}`}>Fecha:</label>
          <input
            ref={fechaRef}
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

        {puedePublicar && (
          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={publico} onChange={e => setPublico(e.target.checked)} disabled={loading} />
              Mostrar en la agenda pública
            </label>
            <p className={styles.fieldNote}>Aparecerá cuando la reserva esté aprobada y mientras el evento no haya terminado.</p>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Enviando...' : 'Solicitar Reserva'}
        </button>
      </form>
    </div>
  );
}
