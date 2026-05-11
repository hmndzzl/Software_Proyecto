import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import type { BadgeKind } from '../../components/ui/Badge';
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

const ESTADO_LABEL: Record<number, string> = { 1: 'Pendiente', 2: 'Confirmada', 3: 'Rechazada' };
const ESTADO_KIND: Record<number, BadgeKind> = { 1: 'pendiente', 2: 'confirmada', 3: 'rechazada' };

const fmt  = (f: string) => { const [y, m, d] = f.split('T')[0].split('-'); return `${d}/${m}/${y}`; };
const fmtH = (h: string) => h.substring(0, 5);

const KPI_ITEMS = [
  { label: 'Pendientes',  estadoId: 1, bg: 'var(--color-warnBg)', color: 'var(--color-warn)'  },
  { label: 'Confirmadas', estadoId: 2, bg: 'var(--color-okBg)',   color: 'var(--color-ok)'    },
  { label: 'Rechazadas',  estadoId: 3, bg: 'var(--color-badBg)',  color: 'var(--color-bad)'   },
];

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
    <div className={styles.page}>
      <PageHeader
        kicker="Historial Personal"
        title="Mis Reservas"
        subtitle="Revisa el estado de tus solicitudes de espacios parroquiales."
      />

      {/* KPI chips */}
      {!loading && !error && reservas.length > 0 && (
        <div className={styles.kpiRow}>
          {KPI_ITEMS.map(({ label, estadoId, bg, color }) => (
            <div key={label} className={styles.kpiChip} style={{ background: bg }}>
              <span className={styles.kpiNum} style={{ color }}>
                {reservas.filter(r => r.estado_reserva_id === estadoId).length}
              </span>
              <span className={styles.kpiLabel} style={{ color }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHead
          title="Historial de Solicitudes"
          hint={!loading ? `${reservas.length} solicitudes` : undefined}
        />

        {loading && <p className={styles.msg}>Cargando tus reservas...</p>}
        {error   && <p className={`${styles.msg} ${styles.msgError}`}>{error}</p>}
        {!loading && !error && reservas.length === 0 && (
          <p className={styles.msg}>Aún no tienes reservas registradas.</p>
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
                    <td className={styles.mono}>{r.id}</td>
                    <td className={styles.bold}>{r.evento_descripcion ?? <span className={styles.muted}>Sin evento</span>}</td>
                    <td>{r.espacio_nombre ?? '—'}</td>
                    <td className={styles.mono}>{fmt(r.fecha)}</td>
                    <td className={styles.mono}>{fmtH(r.hora_inicio)}–{fmtH(r.hora_fin)}</td>
                    <td>
                      <Badge kind={ESTADO_KIND[r.estado_reserva_id] ?? 'neutral'}>
                        {ESTADO_LABEL[r.estado_reserva_id] ?? 'Desconocido'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
