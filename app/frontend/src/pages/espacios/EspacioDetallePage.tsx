import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Espacio } from '../../modules/espacios/components/EspacioCard';
import styles from './EspacioDetallePage.module.css';

export default function EspacioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL}/api/espacios/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Espacio no encontrado');
        return res.json();
      })
      .then((data) => {
        setEspacio(data);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, [id]);

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">

          <button className={styles.backBtn} onClick={() => navigate('/espacios')}>
            ← Volver a Espacios
          </button>

          {cargando && <p className={styles.mensaje}>Cargando...</p>}
          {error && <p className={styles.error}>{error}</p>}

          {espacio && (
            <>
              {/* Banner — área para imagen futura */}
              <div className={styles.banner}>🏛️</div>

              <h2 className={styles.nombre}>{espacio.nombre}</h2>

              <p className={styles.capacidad}>
                <span>👥</span>
                {espacio.capacidad != null
                  ? `Capacidad: ${espacio.capacidad} personas`
                  : 'Capacidad no definida'}
              </p>

              {/* Reservas del día — se implementará en próximos sprints */}
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitulo}>Disponibilidad y reservas</h3>
                <p className={styles.infoBoxTexto}>
                  La visualización de reservas activas y disponibilidad del espacio
                  estará disponible en próximos sprints.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
