import { useEffect, useState } from 'react';
import { Evento } from '../../../types';
import { usuarioTieneRol, ROLES } from '../../../utils/roles';
import apiClient from '../../../api/client';
import { CardHead } from '../../../components/ui/Card';
import Btn from '../../../components/ui/Btn';
import SortableTh from '../../../components/ui/SortableTh';
import { useSortableTable } from '../../../hooks/useSortableTable';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import { formatFecha as fmt, formatHora as fmtH } from '../../../utils/date';
import styles from './ListaEventos.module.css';

type SortKey = 'id' | 'descripcion' | 'encargado' | 'fecha' | 'espacio';

const SORT_VALUE: Record<SortKey, (ev: Evento) => string | number> = {
  id: (ev) => ev.id,
  descripcion: (ev) => ev.descripcion.toLowerCase(),
  encargado: (ev) => (ev.nombre_encargado ?? '').toLowerCase(),
  fecha: (ev) => `${ev.fecha} ${ev.hora_inicio}`,
  espacio: (ev) => (ev.nombre_espacio ?? '').toLowerCase(),
};

export default function ListaEventos({
  refreshKey,
  onEditar,
}: {
  refreshKey?: number;
  onEditar?: (evento: Evento) => void;
}) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const { sortKey, sortDir, toggleSort, sortedData: eventosOrdenados } = useSortableTable(eventos, SORT_VALUE);

  const puedeEditar = usuarioTieneRol([ROLES.SACERDOTE, ROLES.ADMIN]);

  const fetchEventos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/eventos');
      setEventos(res.data);
    } catch {
      setError('Error de red al obtener los eventos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, [refreshKey]);

  return (
    <div>
      <CardHead title="Lista de Eventos" hint={!loading && eventos.length > 0 ? `${eventos.length} eventos` : undefined} />

      {loading && <LoadingState label="Cargando eventos..." />}
      {error   && <ErrorState message={error} onRetry={fetchEventos} />}

      {!loading && !error && eventos.length === 0 && (
        <EmptyState message="No hay eventos registrados." />
      )}

      {!loading && eventos.length > 0 && (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <SortableTh label="#" sortKey="id" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Descripción" sortKey="descripcion" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Encargado" sortKey="encargado" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Fecha" sortKey="fecha" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th>Horario</th>
                <SortableTh label="Espacio" sortKey="espacio" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                {puedeEditar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {eventosOrdenados.map(ev => (
                <tr key={ev.id}>
                  <td>{ev.id}</td>
                  <td>{ev.descripcion}</td>
                  <td>{ev.nombre_encargado}</td>
                  <td>{fmt(ev.fecha)}</td>
                  <td>{fmtH(ev.hora_inicio)}–{fmtH(ev.hora_fin)}</td>
                  <td>{ev.nombre_espacio ?? '—'}</td>
                  {puedeEditar && (
                    <td>
                      {onEditar && (
                        <Btn kind="ghost" size="sm" onClick={() => onEditar(ev)}>
                          Editar
                        </Btn>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
