import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

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

const ESTADO_COLOR: Record<number, string> = {
  1: '#b45309',
  2: '#2e7d32',
  3: '#c0392b',
};

const ESTADO_BG: Record<number, string> = {
  1: '#fef9c3',
  2: '#dcfce7',
  3: '#fde8e8',
};

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

  const pendientes   = reservas.filter(r => r.estado_reserva_id === 1).length;
  const confirmadas  = reservas.filter(r => r.estado_reserva_id === 2).length;
  const rechazadas   = reservas.filter(r => r.estado_reserva_id === 3).length;

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">
          <h2 className="card-title">Mis Reservas</h2>

          {/* Resumen rápido */}
          {!loading && !error && reservas.length > 0 && (
            <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
              {[
                { label: 'Pendientes',  count: pendientes,  bg: '#fef9c3', color: '#b45309' },
                { label: 'Confirmadas', count: confirmadas, bg: '#dcfce7', color: '#2e7d32' },
                { label: 'Rechazadas',  count: rechazadas,  bg: '#fde8e8', color: '#c0392b' },
              ].map(s => (
                <div key={s.label} style={{
                  backgroundColor: s.bg,
                  borderRadius: '12px',
                  padding: '12px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '100px',
                }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: s.color }}>{s.count}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: s.color }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {loading && <p style={{ color: '#555', fontSize: '14px' }}>Cargando tus reservas...</p>}
          {error   && <p className="error-text">{error}</p>}

          {!loading && !error && reservas.length === 0 && (
            <p style={{ color: '#777', fontSize: '14px' }}>Aún no tienes reservas registradas.</p>
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
                      <td style={{ fontWeight: 600 }}>
                        {r.evento_descripcion ?? <span style={{ color: '#aaa', fontStyle: 'italic' }}>Sin evento</span>}
                      </td>
                      <td>{r.espacio_nombre ?? '—'}</td>
                      <td>{fmt(r.fecha)}</td>
                      <td>{fmtH(r.hora_inicio)}–{fmtH(r.hora_fin)}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '50px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: ESTADO_COLOR[r.estado_reserva_id] ?? '#333',
                          backgroundColor: ESTADO_BG[r.estado_reserva_id] ?? '#f0f0f0',
                        }}>
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
