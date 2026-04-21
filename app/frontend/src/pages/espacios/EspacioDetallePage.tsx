import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Espacio } from '../../modules/espacios/components/EspacioCard';
import styles from './EspacioDetallePage.module.css';

interface Reserva {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado_reserva_id: number;
}

const ESTADO_LABEL: Record<number, string> = { 1: 'Pendiente', 2: 'Confirmada', 3: 'Rechazada' };
const ESTADO_CLASS: Record<number, string> = {
  1: styles.badgePendiente,
  2: styles.badgeConfirmada,
  3: styles.badgeRechazada,
};

function formatFecha(fecha: string) {
  const [year, month, day] = fecha.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

function formatHora(hora: string) {
  return hora.substring(0, 5);
}

export default function EspacioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Obtener usuario del localStorage para verificar permisos administrativos
  const usuarioInfo = localStorage.getItem('usuario');
  const usuario = usuarioInfo ? JSON.parse(usuarioInfo) : null;
  const esAdminOSacerdote = usuario && (usuario.rol_id === 1 || usuario.rol_id === 5);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/api/espacios/${id}`, { headers }),
      fetch(`${import.meta.env.VITE_API_URL}/api/reservas?espacio_id=${id}`, { headers }),
    ])
      .then(async ([resEspacio, resReservas]) => {
        if (!resEspacio.ok) throw new Error('Espacio no encontrado');
        const [dataEspacio, dataReservas] = await Promise.all([
          resEspacio.json(),
          resReservas.ok ? resReservas.json() : [],
        ]);
        setEspacio(dataEspacio);
        setReservas(dataReservas);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, [id]);

  const cambiarEstado = async (reservaId: number, nuevoEstado: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reservas/${reservaId}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ estado_id: nuevoEstado })
      });

      if (response.ok) {
        // Recargar la lista de reservas para ver el estado actualizado
        const resReservas = await fetch(`${import.meta.env.VITE_API_URL}/api/reservas?espacio_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resReservas.ok) {
          setReservas(await resReservas.json());
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Error al cambiar el estado de la reserva');
      }
    } catch (error) {
      alert('Error de red al cambiar el estado de la reserva');
    }
  };

  if (cargando) {
    return (
      <div className="page-container">
        <div className="content-container">
          <div className="card">
            <p className={styles.mensaje}>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !espacio) {
    return (
      <div className="page-container">
        <div className="content-container">
          <div className="card">
            <button className={styles.backBtn} onClick={() => navigate('/espacios')}>
              ← Volver a Espacios
            </button>
            <p className={styles.error}>{error || 'Espacio no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">

          <button className={styles.backBtn} onClick={() => navigate('/espacios')}>
            ← Volver a Espacios
          </button>

          {/* Banner — área para imagen futura */}
          <div className={styles.banner}>🏛️</div>

          <h2 className={styles.nombre}>{espacio.nombre}</h2>
          <p className={styles.capacidad}>
            <span>👥</span>
            {espacio.capacidad != null
              ? `Capacidad: ${espacio.capacidad} personas`
              : 'Capacidad no definida'}
          </p>

          {/* Reservas del espacio */}
          <div className={styles.seccion}>
            <h3 className={styles.seccionTitulo}>Reservas registradas</h3>

            {reservas.length === 0 ? (
              <p className={styles.mensaje}>No hay reservas para este espacio.</p>
            ) : (
              reservas.map((r) => (
                <div key={r.id} className={styles.reservaItem}>
                  <div>
                    <p className={styles.reservaFecha}>{formatFecha(r.fecha)}</p>
                    <p className={styles.reservaHorario}>
                      {formatHora(r.hora_inicio)} — {formatHora(r.hora_fin)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`${styles.badge} ${ESTADO_CLASS[r.estado_reserva_id] ?? ''}`}>
                      {ESTADO_LABEL[r.estado_reserva_id] ?? 'Desconocido'}
                    </span>
                    {esAdminOSacerdote && r.estado_reserva_id === 1 && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => cambiarEstado(r.id, 2)}
                          style={{ padding: '4px 8px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Aprobar
                        </button>
                        <button 
                          onClick={() => cambiarEstado(r.id, 3)}
                          style={{ padding: '4px 8px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Funcionalidades pendientes de implementar */}
          <div className={styles.seccion}>
            <div className={styles.infoBox}>
              <h3 className={styles.infoBoxTitulo}>Próximas funcionalidades en proximos sprints</h3>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}