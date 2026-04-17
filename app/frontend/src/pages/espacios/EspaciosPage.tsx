import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EspacioCard, { Espacio } from '../../modules/espacios/components/EspacioCard';
import styles from './EspaciosPage.module.css';

export default function EspaciosPage() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL}/api/espacios`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar los espacios');
        return res.json();
      })
      .then((data) => {
        setEspacios(data);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, []);

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">

          <div className={styles.header}>
            <h2 className={styles.titulo}>Espacios de la Parroquia</h2>
            <p className={styles.subtitulo}>Consulta los salones y áreas disponibles para reservar.</p>
          </div>

          {cargando && <p className={styles.mensaje}>Cargando espacios...</p>}
          {error && <p className={styles.error}>Error: {error}</p>}

          {!cargando && !error && espacios.length === 0 && (
            <p className={styles.mensaje}>No hay espacios registrados.</p>
          )}

          {!cargando && !error && espacios.length > 0 && (
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
