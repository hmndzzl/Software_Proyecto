import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import type { BadgeKind } from '../../components/ui/Badge';
import Btn from '../../components/ui/Btn';
import SortableTh from '../../components/ui/SortableTh';
import { useSortableTable } from '../../hooks/useSortableTable';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { formatFecha, formatHora } from '../../utils/date';
import { ESTADOS_RESERVA } from '../../utils/estadosReserva';
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
  evento_titulo: string | null;
}

const ESTADO_LABEL: Record<number, string> = { 1: 'Pendiente', 2: 'Confirmada', 3: 'Rechazada', 4: 'Cancelada' };
const ESTADO_KIND: Record<number, BadgeKind> = { 1: 'pendiente', 2: 'confirmada', 3: 'rechazada', 4: 'cancelada' };

const KPI_ITEMS = [
  { label: 'Pendientes',  estadoId: 1, bg: 'var(--color-warnBg)', color: 'var(--color-warn)'  },
  { label: 'Confirmadas', estadoId: 2, bg: 'var(--color-okBg)',   color: 'var(--color-ok)'    },
  { label: 'Rechazadas',  estadoId: 3, bg: 'var(--color-badBg)',  color: 'var(--color-bad)'   },
  { label: 'Canceladas',  estadoId: 4, bg: 'var(--color-badBg)',  color: 'var(--color-bad)'   },
];

type SortKey = 'id' | 'espacio' | 'fecha' | 'estado';

const SORT_VALUE: Record<SortKey, (r: MiReserva) => string | number> = {
  id: (r) => r.id,
  espacio: (r) => (r.espacio_nombre ?? '').toLowerCase(),
  fecha: (r) => `${r.fecha} ${r.hora_inicio}`,
  estado: (r) => ESTADO_LABEL[r.estado_reserva_id] ?? '',
};

export default function MisReservasPage() {
  const [reservas, setReservas] = useState<MiReserva[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const { sortKey, sortDir, toggleSort, sortedData: reservasOrdenadas } = useSortableTable(reservas, SORT_VALUE);

  const cargarReservas = () => {
    setLoading(true);
    setError('');
    apiClient.get('/api/reservas/mis-reservas')
      .then(res => setReservas(res.data))
      .catch(() => setError('Error al cargar tus reservas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarReservas();
  }, []);

  const cancelarReserva = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) return;
    try {
      await apiClient.put(`/api/reservas/${id}/estado`, { estado_id: ESTADOS_RESERVA.CANCELADA });
      cargarReservas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cancelar la reserva');
    }
  };

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

        {loading && <LoadingState label="Cargando tus reservas..." />}
        {error   && <ErrorState message={error} onRetry={cargarReservas} />}
        {!loading && !error && reservas.length === 0 && (
          <EmptyState message="Aún no tienes reservas registradas." />
        )}

        {!loading && !error && reservas.length > 0 && (
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <SortableTh label="#" sortKey="id" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th>Título del Evento</th>
                  <th>Evento</th>
                  <SortableTh label="Espacio" sortKey="espacio" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Fecha" sortKey="fecha" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th>Horario</th>
                  <SortableTh label="Estado" sortKey="estado" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasOrdenadas.map(r => (
                  <tr key={r.id}>
                    <td className={styles.mono}>{r.id}</td>
                    <td className={styles.mono}>{r.evento_titulo ?? <span className={styles.muted}>Sin título</span>}</td>
                    <td className={styles.bold}>{r.evento_descripcion ?? <span className={styles.muted}>Sin evento</span>}</td>
                    <td>{r.espacio_nombre ?? '—'}</td>
                    <td className={styles.mono}>{formatFecha(r.fecha)}</td>
                    <td className={styles.horaCell}>{formatHora(r.hora_inicio)}–{formatHora(r.hora_fin)}</td>
                    <td>
                      <Badge kind={ESTADO_KIND[r.estado_reserva_id] ?? 'neutral'}>
                        {ESTADO_LABEL[r.estado_reserva_id] ?? 'Desconocido'}
                      </Badge>
                    </td>
                    <td>
                      {(r.estado_reserva_id === 1 || r.estado_reserva_id === 2) && (
                        <Btn kind="bad" size="sm" onClick={() => cancelarReserva(r.id)}>Cancelar</Btn>
                      )}
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
