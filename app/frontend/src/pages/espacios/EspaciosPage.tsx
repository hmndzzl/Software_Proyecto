import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EspacioCard, { Espacio } from '../../modules/espacios/components/EspacioCard';

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

          {/* Encabezado */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', color: '#222' }}>
              Espacios de la Parroquia
            </h2>
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
              Consulta los salones y áreas disponibles para reservar.
            </p>
          </div>

          {/* Estados de carga y error */}
          {cargando && (
            <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
              Cargando espacios...
            </p>
          )}

          {error && (
            <p style={{ textAlign: 'center', color: '#d32f2f', padding: '40px 0', fontWeight: 600 }}>
              Error: {error}
            </p>
          )}

          {/* Grid de tarjetas */}
          {!cargando && !error && espacios.length === 0 && (
            <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
              No hay espacios registrados.
            </p>
          )}

          {!cargando && !error && espacios.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '24px',
            }}>
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