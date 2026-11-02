import { useId, useState, useEffect, useRef } from 'react';
import { useViewState } from '../../hooks/useViewState';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import EspacioCard, { Espacio } from '../../modules/espacios/components/EspacioCard';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHead } from '../../components/ui/Card';
import { Field, InputUI } from '../../components/ui/Field';
import Btn from '../../components/ui/Btn';
import { formatFecha, formatFechaHora, formatHorario } from '../../utils/date';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { getApiErrorMessage } from '../../utils/apiError';
import styles from './EspaciosPage.module.css';
import EspacioGestion from '../../modules/espacios/components/EspacioGestion';

const ACTUALIZACION_MS = 60_000;
interface Consulta { instante: string; fecha: string; inicio: string; fin: string; }

export default function EspaciosPage() {
  const fieldId = useId();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');
  const [fecha, setFecha] = useViewState('espacios:fecha', '');
  const [horaInicio, setHoraInicio] = useViewState('espacios:inicio', '');
  const [horaFin, setHoraFin] = useViewState('espacios:fin', '');
  const [validacion, setValidacion] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const [avisoActualizacion, setAvisoActualizacion] = useState('');
  const ultimaRespuesta = useRef('');
  const navigate = useNavigate();

  useEffect(() => {
    const actualizar = () => { if (document.visibilityState !== 'hidden') setRefreshTick(t => t + 1); };
    const timer = window.setInterval(actualizar, ACTUALIZACION_MS);
    window.addEventListener('focus', actualizar);
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', actualizar);
      document.removeEventListener('visibilitychange', actualizar);
    };
  }, []);

  const cargarEspacios = () => {
    // Un formulario guardado también debe refrescar el listado si los filtros estaban a medio completar.
    if ((fecha || horaInicio || horaFin) && !(fecha && horaInicio && horaFin && horaInicio < horaFin)) {
      setFecha(''); setHoraInicio(''); setHoraFin('');
    }
    setRetryTick(t => t + 1);
  };

  useEffect(() => {
    const filtros = { fecha, hora_inicio: horaInicio, hora_fin: horaFin };
    const campos = Object.values(filtros);
    const todosVacios = campos.every(campo => !campo);
    const todosCompletos = campos.every(Boolean);

    if (!todosCompletos && !todosVacios) {
      setValidacion('Completa fecha, hora inicio y hora fin para consultar disponibilidad.');
      setError('');
      setConsulta(null);
      setActualizando(false);
      setCargando(false);
      setEspacios(prev => prev.map(espacio => ({ ...espacio, disponible: undefined })));
      return;
    }

    if (todosCompletos && horaInicio >= horaFin) {
      setValidacion('La hora de inicio debe ser menor que la hora de fin.');
      setError('');
      setConsulta(null);
      setActualizando(false);
      setCargando(false);
      setEspacios(prev => prev.map(espacio => ({ ...espacio, disponible: undefined })));
      return;
    }

    let cancelado = false;

    const clave = JSON.stringify([fecha, horaInicio, horaFin, retryTick]);
    const enSegundoPlano = ultimaRespuesta.current === clave;
    setValidacion('');
    setError('');
    setActualizando(true);
    if (!enSegundoPlano) { setCargando(true); setConsulta(null); }

    apiClient.get<Espacio[]>('/api/espacios', { params: todosCompletos ? filtros : undefined })
      .then(res => {
        if (cancelado) return;
        setEspacios(res.data);
        ultimaRespuesta.current = clave;
        setAvisoActualizacion('');
        setConsulta(res.data.length ? { instante: res.data[0].consultado_en ?? new Date().toISOString(), fecha, inicio: horaInicio, fin: horaFin } : null);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        const mensaje = getApiErrorMessage(err, 'Error al cargar los espacios', 'message');
        if (enSegundoPlano) setAvisoActualizacion(mensaje); else setError(mensaje);
      })
      .finally(() => {
        if (!cancelado) { setCargando(false); setActualizando(false); }
      });

    return () => { cancelado = true; };
  }, [fecha, horaInicio, horaFin, retryTick, refreshTick]);

  return (
    <div className={styles.page}>
      <PageHeader
        actions={<EspacioGestion onChanged={cargarEspacios} />}
        kicker="Espacios Parroquiales"
        title="Recintos y salones"
        subtitle="Consulta los espacios disponibles para reservar y organizar actividades."
      />

      <Card>
        <CardHead title="Disponibilidad" />
        <CardBody>
          <div className={styles.filters}>
            <Field label="Fecha" htmlFor={`${fieldId}-fecha`}>
              <InputUI id={`${fieldId}-fecha`}
                type="date"
                required
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
              />
            </Field>

            <Field label="Hora inicio" htmlFor={`${fieldId}-inicio`}>
              <InputUI id={`${fieldId}-inicio`}
                type="time"
                required
                value={horaInicio}
                onChange={(event) => setHoraInicio(event.target.value)}
              />
            </Field>

            <Field label="Hora fin" htmlFor={`${fieldId}-fin`}>
              <InputUI id={`${fieldId}-fin`}
                type="time"
                required
                value={horaFin}
                onChange={(event) => setHoraFin(event.target.value)}
              />
            </Field>
          </div>

          {validacion && <p className={styles.validation}>{validacion}</p>}
        </CardBody>
      </Card>

      {consulta && !cargando && !error && <div className={styles.consultaBar}>
        <p className={styles.consultaTexto}>
          {consulta.fecha ? <>Disponibilidad para <time dateTime={consulta.fecha}>{formatFecha(consulta.fecha)}</time> · {formatHorario(consulta.inicio, consulta.fin)}</> :
            <>{avisoActualizacion ? 'Última consulta' : 'Disponibilidad actual'} · <time dateTime={consulta.instante}>{formatFechaHora(consulta.instante)}</time></>}
          <span> · hora de Guatemala</span>
        </p>
        <Btn type="button" kind="ghost" size="sm" disabled={actualizando} onClick={() => setRefreshTick(t => t + 1)}>{actualizando ? 'Actualizando…' : 'Actualizar'}</Btn>
      </div>}
      {avisoActualizacion && consulta && <p className={styles.validation} role="alert">{avisoActualizacion}. Se conserva la última consulta; puedes volver a actualizar.</p>}

      {cargando && <LoadingState variant="cards" label="Cargando espacios..." />}
      {error    && <ErrorState message={error} onRetry={cargarEspacios} />}

      {!cargando && !error && espacios.length === 0 && (
        <EmptyState message="No hay espacios registrados." />
      )}

      {!cargando && !error && espacios.length > 0 && (
        <div className={styles.grid}>
          {espacios.map(espacio => (
            <EspacioCard
              key={espacio.id}
              espacio={espacio}
              onChanged={cargarEspacios}
              onClick={id => navigate(`/espacios/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
