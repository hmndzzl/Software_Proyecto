import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import styles from './MisReservasPage.module.css';

interface MiReserva {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  espacio_nombre: string | null;
  estado_reserva_id: number;
  evento_id: number | null;
  evento_descripcion: string | null;
}

const ESTADO_LABEL: Record<number, string> = {
  1: 'Pendiente',
  2: 'Confirmada',
  3: 'Rechazada',
};

const ESTADO_BADGE_CLASS: Record<number, string> = {
  1: styles.badgePendiente,
  2: styles.badgeConfirmada,
  3: styles.badgeRechazada,
};

const RESUMEN_ITEMS = [
  { label: 'Pendientes',  estadoId: 1, cardClass: styles.resumenCardPendiente,  colorClass: styles.resumenPendiente  },
  { label: 'Confirmadas', estadoId: 2, cardClass: styles.resumenCardConfirmada, colorClass: styles.resumenConfirmada },
  { label: 'Rechazadas',  estadoId: 3, cardClass: styles.resumenCardRechazada,  colorClass: styles.resumenRechazada  },
];

const fmt  = (f: string) => { const [y, m, d] = f.split('T')[0].split('-'); return `${d}/${m}/${y}`; };
const fmtH = (h: string) => h.substring(0, 5);

export default function MisReservasPage() {
  const [reservas, setReservas] = useState<MiReserva[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    apiClient.get('/api/reservas/mis-reservas')
      .then(res => setReservas(res.data))
      .catch(() => setError('Error al cargar tus reservas.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">
          <h2 className="card-title">Mis Reservas</h2>

          {!loading && !error && reservas.length > 0 && (
            <div className={styles.resumenContainer}>
              {RESUMEN_ITEMS.map(({ label, estadoId, cardClass, colorClass }) => (
                <div key={label} className={`${styles.resumenCard} ${cardClass}`}>
                  <span className={`${styles.resumenCount} ${colorClass}`}>
                    {reservas.filter(r => r.estado_reserva_id === estadoId).length}
                  </span>
                  <span className={`${styles.resumenLabel} ${colorClass}`}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {loading && <p className={styles.textoInfo}>Cargando tus reservas...</p>}
          {error   && <p className="error-text">{error}</p>}

          {!loading && !error && reservas.length === 0 && (
            <p className={styles.textoVacio}>Aún no tienes reservas registradas.</p>
          )}

          {!loading && !error && reservas.length > 0 && (
            <div className="table-container">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Evento</th>
                    <th>Espacio</th>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map(r => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td className={styles.celdaEvento}>
                        {r.evento_descripcion ?? <span className={styles.sinEvento}>Sin evento</span>}
                      </td>
                      <td>{r.espacio_nombre ?? '—'}</td>
                      <td>{fmt(r.fecha)}</td>
                      <td>{fmtH(r.hora_inicio)}–{fmtH(r.hora_fin)}</td>
                      <td>
                        <span className={`${styles.badge} ${ESTADO_BADGE_CLASS[r.estado_reserva_id] ?? ''}`}>
                          {ESTADO_LABEL[r.estado_reserva_id] ?? 'Desconocido'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
