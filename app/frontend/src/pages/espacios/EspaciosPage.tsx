import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import EspacioCard, { Espacio } from '../../modules/espacios/components/EspacioCard';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHead } from '../../components/ui/Card';
import { Field, InputUI } from '../../components/ui/Field';
import styles from './EspaciosPage.module.css';

export default function EspaciosPage() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [validacion, setValidacion] = useState('');
  const navigate = useNavigate();

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

    apiClient.get('/api/espacios', { params: todosCompletos ? filtros : undefined })
      .then(res => {
        if (cancelado) return;
        setEspacios(res.data);
      })
      .catch(err => {
        if (cancelado) return;
        setError(err.response?.data?.message || 'Error al cargar los espacios');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => { cancelado = true; };
  }, [fecha, horaInicio, horaFin]);

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Espacios Parroquiales"
        title="Recintos y salones"
        subtitle="Consulta los espacios disponibles para reservar y organizar actividades."
      />

      <Card>
        <CardHead
          title="Disponibilidad"
          hint="Filtra por fecha y horario para ver espacios libres u ocupados."
        />
        <CardBody>
          <div className={styles.filters}>
            <Field label="Fecha">
              <InputUI
                type="date"
                required
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
              />
            </Field>

            <Field label="Hora inicio">
              <InputUI
                type="time"
                required
                value={horaInicio}
                onChange={(event) => setHoraInicio(event.target.value)}
              />
            </Field>

            <Field label="Hora fin">
              <InputUI
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

      {cargando && <p className={styles.msg}>Cargando espacios...</p>}
      {error    && <p className={`${styles.msg} ${styles.msgError}`}>{error}</p>}

      {!cargando && !error && espacios.length === 0 && (
        <p className={styles.msg}>No hay espacios registrados.</p>
      )}

      {!cargando && !error && espacios.length > 0 && (
        <div className={styles.grid}>
          {espacios.map(espacio => (
            <EspacioCard
              key={espacio.id}
              espacio={espacio}
              onClick={id => navigate(`/espacios/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
