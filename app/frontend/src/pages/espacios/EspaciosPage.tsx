import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import EspacioCard, { Espacio } from '../../modules/espacios/components/EspacioCard';
import PageHeader from '../../components/ui/PageHeader';
import styles from './EspaciosPage.module.css';

export default function EspaciosPage() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/api/espacios')
      .then(res => { setEspacios(res.data); setCargando(false); })
      .catch(() => { setError('Error al cargar los espacios'); setCargando(false); });
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Espacios Parroquiales"
        title="Recintos y salones"
        subtitle="Consulta los espacios disponibles para reservar y organizar actividades."
      />

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
