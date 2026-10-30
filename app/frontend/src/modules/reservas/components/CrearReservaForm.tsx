import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../api/client';
import { useToast } from '../../../context/ToastContext';
import { formatFecha, formatHorario } from '../../../utils/date';
import { ROLES } from '../../../utils/roles';
import { getApiErrorMessage } from '../../../utils/apiError';
import { useAuth } from '../../../context/AuthContext';
import type { Espacio } from '../../espacios/components/EspacioCard';
import EspacioFoto from '../../espacios/components/EspacioFoto';
import DisponibilidadEspacioDia from './DisponibilidadEspacioDia';
import SelectorSemanaEspacio from './SelectorSemanaEspacio';
import SelectorEspacios from './SelectorEspacios';
import AforoField, { errorAforo } from '../../../components/ui/AforoField';
import { ESTADOS_RESERVA } from '../../../utils/estadosReserva';
import type { Reserva } from '../../../types';
import styles from '../../../styles/Form.module.css';

interface CrearReservaFormProps {
  onReservaCreada?: () => void;
  autoFocus?: boolean;
  contexto?: 'reserva' | 'evento';
  onGuardandoChange?: (guardando: boolean) => void;
  espacioInicial?: string;
}

export default function CrearReservaForm({ onReservaCreada, autoFocus = false, espacioInicial, contexto = 'reserva', onGuardandoChange }: CrearReservaFormProps) {
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
  const [reservasEspacio, setReservasEspacio] = useState<Reserva[]>([]);
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const espacioRef = useRef<HTMLDivElement>(null);
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
    if (espacioResuelto) {
      fechaRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      fechaRef.current?.focus();
      return;
    }
    espacioRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    // Enfoca la primera tarjeta seleccionable en vez del contenedor, para poder elegir con teclado de inmediato.
    (espacioRef.current?.querySelector<HTMLElement>('[role="button"]') ?? espacioRef.current)?.focus();
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

  // Reservas del espacio elegido, para avisar disponibilidad en tiempo real mientras se llena
  // fecha/horario — sin esto, el único aviso de conflicto llegaba al aprobar la reserva (o nunca,
  // si quien la crea no es quien la aprueba).
  useEffect(() => {
    if (!espacioId) { setReservasEspacio([]); return; }
    let cancelado = false;
    apiClient.get<Reserva[]>(`/api/reservas?espacio_id=${espacioId}`)
      .then((response) => { if (!cancelado) setReservasEspacio(response.data); })
      .catch(() => { if (!cancelado) setReservasEspacio([]); });
    return () => { cancelado = true; };
  }, [espacioId]);

  // Mismo criterio de solape que el backend usa al aprobar (reserva.controller.ts): solo las
  // reservas ya Confirmadas bloquean de verdad el horario.
  const conflicto = fecha && horaInicio && horaFin && horaInicio < horaFin
    ? reservasEspacio.find((r) => r.fecha === fecha
        && r.estado_reserva_id === ESTADOS_RESERVA.CONFIRMADA
        && r.hora_inicio < horaFin && r.hora_fin > horaInicio)
    : undefined;
  const horarioVerificable = Boolean(espacioId && fecha && horaInicio && horaFin && horaInicio < horaFin);

  const [intentoEnvio, setIntentoEnvio] = useState(false);
  const errores: Record<string, string> = intentoEnvio ? {
    titulo: !titulo.trim() ? 'Escribe un título.' : '',
    descripcion: !descripcion.trim() ? 'Describe la actividad.' : '',
    fecha: !fecha ? 'Selecciona una fecha.' : '',
    hora_inicio: !horaInicio ? 'Indica la hora de inicio.' : '',
    hora_fin: !horaFin ? 'Indica la hora de fin.' : horaInicio >= horaFin ? 'La hora de fin debe ser posterior al inicio.' : '',
  } : {};
  const errorCampo = (campo: string) => errores[campo] ? <p id={`reserva-error-${campo}`} className={`${styles.message} ${styles.messageError}`}>{errores[campo]}</p> : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntentoEnvio(true);
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

    if (conflicto) {
      toast.error('Horario no disponible', 'Ese horario se cruza con una reserva ya confirmada en este espacio. Elige otro horario o espacio.');
      return;
    }

    setLoading(true);
    onGuardandoChange?.(true);

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
        contexto === 'evento' ? 'Evento creado' : 'Solicitud enviada',
        `Tu ${contexto === 'evento' ? 'evento en' : 'reserva de'} ${nombreEspacio} para «${titulo}» el ${formatFecha(fecha)}, ${formatHorario(horaInicio, horaFin)}, quedó pendiente de aprobación${puedeAprobar ? '' : ' del sacerdote'}. ` +
          (puedeAprobar
            ? contexto === 'evento' ? 'Puedes aprobar la reserva desde la pantalla Reservas.' : 'Puedes aprobarla tú mismo en la lista de solicitudes de esta página.'
            : 'Puedes revisar su estado en Mis Reservas.'),
        { label: puedeAprobar ? 'Ver reservas' : 'Ver mis reservas', href: puedeAprobar ? '/reservas' : '/mis-reservas' }
      );
      setIntentoEnvio(false);
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
      toast.error(contexto === 'evento' ? 'No se pudo crear el evento' : 'No se pudo crear la reserva', getApiErrorMessage(error, 'Error de red al intentar crear la reserva.', 'message'));
    } finally {
      setLoading(false);
      onGuardandoChange?.(false);
    }
  };

  const espacioInicialNoEncontrado = Boolean(espacioInicial)
    && espaciosCargados
    && !espacios.some((esp) => String(esp.id) === espacioInicial);

  return (
    <div>
      {espacioInicialNoEncontrado && (
        <div className={`${styles.warningBox} ${styles.infoBoxMargin}`}>
          El espacio del enlace ya no está disponible. Selecciona uno manualmente.
        </div>
      )}

      {espacioSeleccionado && (
        <div className={`${styles.espacioHeader} ${styles.infoBoxMargin}`}>
          <EspacioFoto className={styles.espacioHeaderFoto} nombre={espacioSeleccionado.nombre} fotoUrl={espacioSeleccionado.foto_url} />
          <div className={styles.espacioHeaderInfo}>
            <span className={styles.espacioHeaderNombre}>{espacioSeleccionado.nombre}</span>
            <span className={styles.espacioHeaderCapacidad}>
              {espacioSeleccionado.capacidad != null ? `Capacidad: ${espacioSeleccionado.capacidad} personas` : 'Capacidad sin definir'}
            </span>
            <Link to={`/espacios/${espacioSeleccionado.id}`} className={styles.espacioDetalleLink}>
              Ver detalle del espacio
            </Link>
          </div>
        </div>
      )}

      {espacioSeleccionado && (
        <div className={styles.infoBoxMargin}>
          <SelectorSemanaEspacio reservas={reservasEspacio} fechaSeleccionada={fecha} onSeleccionarDia={setFecha} />
        </div>
      )}

      {espacioSeleccionado && fecha && (
        <div className={styles.infoBoxMargin}>
          <DisponibilidadEspacioDia
            fecha={fecha}
            reservas={reservasEspacio}
            horaInicio={horaInicio}
            horaFin={horaFin}
            hayConflicto={Boolean(conflicto)}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <h3 className={styles.sectionTitle}>Espacio y asistencia</h3>
        <p className={styles.fieldNote}>Selecciona el espacio, indica cuántas personas asistirán y completa la fecha, el horario y los datos de la actividad. La solicitud quedará pendiente de aprobación.</p>
        <div className={styles.field}>
          <span id="espacio_id-label" className={`${styles.label} ${styles.required}`}>Espacio:</span>
          <div ref={espacioRef} tabIndex={-1}>
            <SelectorEspacios espacios={espacios} valor={espacioId} onChange={setEspacioId} labelId="espacio_id-label" cargando={!espaciosCargados} />
          </div>
        </div>

        <AforoField value={cantidad} onChange={setCantidad} capacidad={espacioSeleccionado ? espacioSeleccionado.capacidad ?? null : undefined} />
        <div className={styles.field}>
          <h3 className={styles.sectionTitle}>Fecha y horario</h3>
          <label htmlFor="fecha" className={`${styles.label} ${styles.required}`}>Fecha:</label>
          <input
            ref={fechaRef}
            type="date"
            id="fecha"
            aria-invalid={Boolean(errores.fecha)}
            aria-describedby={errores.fecha ? 'reserva-error-fecha' : undefined}
            className={styles.input}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        {errorCampo('fecha')}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="hora_inicio" className={`${styles.label} ${styles.required}`}>Hora de Inicio:</label>
            <input
              type="time"
              id="hora_inicio"
            aria-invalid={Boolean(errores.hora_inicio)}
            aria-describedby={errores.hora_inicio ? 'reserva-error-hora_inicio' : undefined}
              className={styles.input}
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          {errorCampo('hora_inicio')}
        </div>

          <div className={styles.field}>
            <label htmlFor="hora_fin" className={`${styles.label} ${styles.required}`}>Hora de Fin:</label>
            <input
              type="time"
              id="hora_fin"
            aria-invalid={Boolean(errores.hora_fin)}
            aria-describedby={errores.hora_fin ? 'reserva-error-hora_fin' : undefined}
              className={styles.input}
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
            />
          {errorCampo('hora_fin')}
        </div>
        </div>

        {horarioVerificable && (
          conflicto ? (
            <div className={styles.warningBox} role="alert">
              Este horario se cruza con una reserva ya confirmada: {formatHorario(conflicto.hora_inicio, conflicto.hora_fin)}
              {conflicto.evento_titulo ? ` — ${conflicto.evento_titulo}` : ''}
              {conflicto.solicitante_nombre ? ` (de ${conflicto.solicitante_nombre})` : ''}. Elige otro horario o espacio.
            </div>
          ) : (
            <div className={styles.okBox}>Horario disponible para este espacio.</div>
          )
        )}

        <div className={styles.field}>
          <h3 className={styles.sectionTitle}>Actividad</h3>
          <label htmlFor="titulo" className={`${styles.label} ${styles.required}`}>Título del Evento:</label>
          <input
            type="text"
            id="titulo"
            aria-invalid={Boolean(errores.titulo)}
            aria-describedby={errores.titulo ? 'reserva-error-titulo' : undefined}
            className={styles.input}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Misa del Día de la Madre"
          />
        {errorCampo('titulo')}
        </div>

        <div className={styles.field}>
          <label htmlFor="descripcion" className={`${styles.label} ${styles.required}`}>Descripción del Evento:</label>
          <input
            type="text"
            id="descripcion"
            aria-invalid={Boolean(errores.descripcion)}
            aria-describedby={errores.descripcion ? 'reserva-error-descripcion' : undefined}
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Celebración en honor a la Virgen, con coro y procesión"
          />
        {errorCampo('descripcion')}
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

        <button type="submit" className="btn-primary" disabled={loading || Boolean(conflicto)}>
          {loading ? 'Enviando...' : contexto === 'evento' ? 'Crear evento' : 'Solicitar Reserva'}
        </button>
      </form>
    </div>
  );
}
