import { useId, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import EspacioCard, { Espacio } from '../../modules/espacios/components/EspacioCard';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHead } from '../../components/ui/Card';
import { Field, InputUI } from '../../components/ui/Field';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { getApiErrorMessage } from '../../utils/apiError';
import styles from './EspaciosPage.module.css';
import EspacioGestion from '../../modules/espacios/components/EspacioGestion';

export default function EspaciosPage() {
  const fieldId = useId();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [validacion, setValidacion] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const navigate = useNavigate();

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
      setCargando(false);
      setEspacios(prev => prev.map(espacio => ({ ...espacio, disponible: undefined })));
      return;
    }

    if (todosCompletos && horaInicio >= horaFin) {
      setValidacion('La hora de inicio debe ser menor que la hora de fin.');
      setError('');
      setCargando(false);
      setEspacios(prev => prev.map(espacio => ({ ...espacio, disponible: undefined })));
      return;
    }

    let cancelado = false;

    setValidacion('');
    setError('');
    setCargando(true);

    apiClient.get<Espacio[]>('/api/espacios', { params: todosCompletos ? filtros : undefined })
      .then(res => {
        if (cancelado) return;
        setEspacios(res.data);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setError(getApiErrorMessage(err, 'Error al cargar los espacios', 'message'));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => { cancelado = true; };
  }, [fecha, horaInicio, horaFin, retryTick]);

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

      {cargando && <LoadingState label="Cargando espacios..." />}
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
