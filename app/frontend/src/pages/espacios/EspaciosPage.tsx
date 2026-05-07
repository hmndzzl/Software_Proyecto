import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import EspacioCard, { Espacio } from '../../modules/espacios/components/EspacioCard';
import styles from './EspaciosPage.module.css';

export default function EspaciosPage() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/api/espacios')
      .then((res) => {
        setEspacios(res.data);
        setCargando(false);
      })
      .catch(() => {
        setError('Error al cargar los espacios');
        setCargando(false);
      });
  }, []);

  // Early returns para estados transitorios
  if (cargando) {
    return (
      <div className="page-container">
        <div className="content-container">
          <div className="card">
            <p className={styles.mensaje}>Cargando espacios...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="content-container">
          <div className="card">
            <p className={styles.error}>Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">

          <div className={styles.header}>
            <h2 className={styles.titulo}>Espacios de la Parroquia</h2>
            <p className={styles.subtitulo}>Consulta los salones y áreas disponibles para reservar.</p>
          </div>

          {espacios.length === 0 ? (
            <p className={styles.mensaje}>No hay espacios registrados.</p>
          ) : (
            <div className={styles.grid}>
              {espacios.map((espacio) => (
                <EspacioCard
                  key={espacio.id}
                  espacio={espacio}
                  onClick={(id) => navigate(`/espacios/${id}`)}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
