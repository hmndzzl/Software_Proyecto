import { useEffect, useState } from 'react';
import { Evento } from '../../../types';
import { usuarioTieneRol, ROLES } from '../../../utils/roles';
import apiClient from '../../../api/client';
import { CardHead } from '../../../components/ui/Card';
import Btn from '../../../components/ui/Btn';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import { formatFecha as fmt, formatHora as fmtH } from '../../../utils/date';
import styles from './ListaEventos.module.css';

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
                <th>#</th>
                <th>Descripción</th>
                <th>Encargado</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Espacio</th>
                {puedeEditar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {eventos.map(ev => (
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
