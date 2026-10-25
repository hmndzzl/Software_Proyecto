import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead } from '../../components/ui/Card';
import ReservaEstadoBadge from '../../components/ui/ReservaEstadoBadge';
import ResumenEstadosReserva from '../../components/ui/ResumenEstadosReserva';
import Btn from '../../components/ui/Btn';
import SortableTh from '../../components/ui/SortableTh';
import TableFilters from '../../components/ui/TableFilters';
import { useTableFilters } from '../../hooks/useTableFilters';
import { useSortableTable } from '../../hooks/useSortableTable';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { formatFecha, formatHorario } from '../../utils/date';
import { ESTADOS_RESERVA, avisoCambioEstadoReserva, etiquetaEstadoReserva, puedeCancelarReserva } from '../../utils/estadosReserva';
import { ROLES_RESERVAS, RUTA_NUEVA_RESERVA } from '../../utils/roles';
import { getApiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import type { Reserva } from '../../types';
import styles from './MisReservasPage.module.css';

type MiReserva = Reserva;

type SortKey = 'id' | 'espacio' | 'fecha' | 'estado' | 'titulo' | 'evento' | 'horario' | 'aforo';

const SORT_VALUE: Record<SortKey, (r: MiReserva) => string | number> = {
  id: (r) => r.id,
  aforo: r => r.cantidad_personas ?? -1,
  titulo: r => r.evento_titulo ?? 'Sin título',
  evento: r => r.evento_descripcion ?? 'Sin evento',
  horario: r => `${r.hora_inicio} ${r.hora_fin}`,
  espacio: (r) => (r.espacio_nombre ?? '').toLowerCase(),
  fecha: (r) => `${r.fecha} ${r.hora_inicio}`,
  estado: (r) => etiquetaEstadoReserva(r.estado_reserva_id),
};

export default function MisReservasPage() {
  const navigate = useNavigate();
  const { tieneRol } = useAuth();
  const puedeReservar = tieneRol(ROLES_RESERVAS);
  const [reservas, setReservas] = useState<MiReserva[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const filtros = useTableFilters(reservas, {
    search: r => [r.id, r.espacio_nombre, r.evento_titulo, r.evento_descripcion], date: r => r.fecha,
    selects: [
      { key: 'estado', label: 'Estado', value: r => etiquetaEstadoReserva(r.estado_reserva_id) || 'Desconocido' },
      { key: 'espacio', label: 'Espacio', value: r => r.espacio_nombre ?? 'Sin espacio' },
    ],
  });
  const { sortKey, sortDir, toggleSort, sortedData: reservasOrdenadas } = useSortableTable(filtros.filteredData, SORT_VALUE);

  const cargarReservas = () => {
    setLoading(true);
    setError('');
    apiClient.get<MiReserva[]>('/api/reservas/mis-reservas')
      .then(res => setReservas(res.data))
      .catch(() => setError('Error al cargar tus reservas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarReservas();
  }, []);

  const toast = useToast();

  const cancelarReserva = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) return;
    try {
      await apiClient.put(`/api/reservas/${id}/estado`, { estado_id: ESTADOS_RESERVA.CANCELADA });
      const aviso = avisoCambioEstadoReserva(ESTADOS_RESERVA.CANCELADA);
      toast.success(aviso.titulo, aviso.mensaje);
      cargarReservas();
    } catch (err: unknown) {
      toast.error('No se pudo cancelar la reserva', getApiErrorMessage(err, 'Error al cancelar la reserva.', 'message'));
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Historial Personal"
        title="Mis Reservas"
        subtitle="Revisa el estado de tus solicitudes de espacios parroquiales."
        actions={puedeReservar && (
          <Btn kind="primary" size="lg" onClick={() => navigate(RUTA_NUEVA_RESERVA)}>
            + Nueva reserva
          </Btn>
        )}
      />

      {/* KPI chips */}
      {!loading && !error && reservas.length > 0 && (
        <ResumenEstadosReserva estadoIds={reservas.map((reserva) => reserva.estado_reserva_id)} />
      )}

      <Card>
        <CardHead
          title="Historial de Solicitudes"
          hint={!loading ? `${reservas.length} solicitudes` : undefined}
        />

        {loading && <LoadingState label="Cargando tus reservas..." />}
        {!loading && !error && <TableFilters {...filtros.controls} label="Filtros de mis reservas" />}
        {error   && <ErrorState message={error} onRetry={cargarReservas} />}
        {!loading && !error && reservas.length === 0 && (
          <>
            <EmptyState message="Aún no tienes reservas registradas." />
            {puedeReservar && (
              <div className={styles.emptyCta}>
                <Btn kind="primary" onClick={() => navigate(RUTA_NUEVA_RESERVA)}>
                  Solicitar mi primera reserva
                </Btn>
              </div>
            )}
          </>
        )}

        {!loading && !error && reservas.length > 0 && (
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <SortableTh label="#" sortKey="id" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Título del Evento" sortKey="titulo" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Evento" sortKey="evento" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Espacio" sortKey="espacio" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Fecha" sortKey="fecha" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Horario" sortKey="horario" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Estado" sortKey="estado" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Personas esperadas" sortKey="aforo" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
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
                    <td className={styles.horaCell}>{formatHorario(r.hora_inicio, r.hora_fin)}</td>
                    <td>
                      <ReservaEstadoBadge estadoId={r.estado_reserva_id} />
                    </td>
                    <td>{r.cantidad_personas ?? 'No registrado'}</td>
                    <td>
                      {puedeCancelarReserva(r.estado_reserva_id) && (
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
