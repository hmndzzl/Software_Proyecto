import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Espacio } from '../../modules/espacios/components/EspacioCard';

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

          {/* Botón volver */}
          <button
            onClick={() => navigate('/espacios')}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              padding: 0,
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Volver a Espacios
          </button>

          {cargando && (
            <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>Cargando...</p>
          )}

          {error && (
            <p style={{ textAlign: 'center', color: '#d32f2f', padding: '40px 0', fontWeight: 600 }}>
              {error}
            </p>
          )}

          {espacio && (
            <>
              {/* Banner — área para imagen futura */}
              <div style={{
                height: '160px',
                background: 'linear-gradient(135deg, #FFD900 0%, #FFC200 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
              }}>
                <span style={{ fontSize: '64px' }}>🏛️</span>
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: '#222' }}>
                {espacio.nombre}
              </h2>

              <p style={{ color: '#666', fontSize: '15px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👥</span>
                {espacio.capacidad != null
                  ? `Capacidad: ${espacio.capacidad} personas`
                  : 'Capacidad no definida'}
              </p>

              {/* Sección de reservas del día — pendiente de implementar en sprints posteriores */}
              <div style={{
                backgroundColor: '#f9f9f9',
                borderRadius: '12px',
                padding: '24px',
                borderLeft: '4px solid #FFD900',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 8px 0', color: '#444' }}>
                  Disponibilidad y reservas
                </h3>
                <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>
                  La visualización de reservas activas y disponibilidad del espacio estará disponible en el próximo sprint.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}