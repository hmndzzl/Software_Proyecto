import { useEffect, useState } from 'react';
import { Grupo } from '../../../types';
import apiClient from '../../../api/client';
import { ROLES } from '../../../utils/roles';
import { useAuth } from '../../../context/AuthContext';
import { CardHead } from '../../../components/ui/Card';
import Btn from '../../../components/ui/Btn';
import Modal from '../../../components/ui/Modal';
import SortableTh from '../../../components/ui/SortableTh';
import TableFilters from '../../../components/ui/TableFilters';
import { useTableFilters } from '../../../hooks/useTableFilters';
import { useSortableTable } from '../../../hooks/useSortableTable';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import styles from './ListaGrupos.module.css';

type SortKey = 'id' | 'nombre' | 'coordinador';

const SORT_VALUE: Record<SortKey, (g: Grupo) => string | number> = {
  id: (g) => g.id,
  nombre: (g) => g.nombre.toLowerCase(),
  coordinador: (g) => g.coordinadores.map((c) => c.nombre).sort().join(', ').toLowerCase(),
};

export default function ListaGrupos({
  refreshKey,
  onEditar
}: {
  refreshKey?: number;
  onEditar?: (grupo: Grupo) => void;
}) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grupoDetalle, setGrupoDetalle] = useState<Grupo | null>(null);

  const filtros = useTableFilters(grupos, {
    search: g => [g.id, g.nombre, ...g.coordinadores.map((c) => c.nombre)],
    selects: [{ key: 'coordinador', label: 'Coordinador', value: g => g.coordinadores.length ? g.coordinadores.map((c) => c.nombre) : 'Sin coordinador' }],
  });
  const { sortKey, sortDir, toggleSort, sortedData: gruposOrdenados } = useSortableTable(filtros.filteredData, SORT_VALUE);

  const { tieneRol } = useAuth();
  const puedeEditar = tieneRol([
    ROLES.SACERDOTE,
    ROLES.COORDINADOR_GRUPOS,
  ]);

  const fetchGrupos = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<Grupo[]>('/api/grupos');
      setGrupos(response.data);
    } catch {
      setError('Error de red al obtener los grupos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, [refreshKey]);

  return (
    <div>
      <CardHead title="Lista de Grupos" hint={!loading && grupos.length > 0 ? `${grupos.length} grupos` : undefined} />
      {!loading && !error && <TableFilters {...filtros.controls} label="Filtros de grupos" />}

      {loading && <LoadingState label="Cargando grupos..." />}
      {error && <ErrorState message={error} onRetry={fetchGrupos} />}

      {!loading && !error && grupos.length === 0 && (
        <EmptyState message="No hay grupos registrados." />
      )}

      {!loading && grupos.length > 0 && (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <SortableTh label="#" sortKey="id" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Nombre" sortKey="nombre" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableTh label="Coordinador(es)" sortKey="coordinador" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                {puedeEditar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {gruposOrdenados.map((g) => (
                <tr key={g.id}>
                  <td>{g.id}</td>
                  <td>
                    <button type="button" className={styles.enlace} onClick={() => setGrupoDetalle(g)}>{g.nombre}</button>
                  </td>
                  <td>
                    {!g.coordinadores.length ? 'Sin coordinador asignado' : <>
                      <span>{g.coordinadores.slice(0, 2).map((c) => c.nombre).join(', ')}</span>
                      {g.coordinadores.length > 2 && <>{' '}<button type="button" className={styles.enlace} onClick={() => setGrupoDetalle(g)}
                        aria-label={`Ver los ${g.coordinadores.length} coordinadores de ${g.nombre}`}>+{g.coordinadores.length - 2} más</button></>}
                    </>}
                  </td>
                  {puedeEditar && (
                    <td>
                      {onEditar && (
                        <Btn kind="ghost" size="sm" onClick={() => onEditar(g)}>
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

      <Modal open={Boolean(grupoDetalle)} title={grupoDetalle ? `Coordinadores de ${grupoDetalle.nombre}` : ''} onClose={() => setGrupoDetalle(null)}>
        {grupoDetalle && (
          grupoDetalle.coordinadores.length === 0 ? (
            <p className={styles.textoInfo}>Este grupo no tiene coordinadores asignados.</p>
          ) : (
            <ul className={styles.personas} aria-label="Coordinadores del grupo">
              {grupoDetalle.coordinadores.map((c) => (
                <li key={c.id} className={styles.persona}>
                  <span className={styles.avatar} aria-hidden="true">{c.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('')}</span>
                  <span>{c.nombre}</span>
                </li>
              ))}
            </ul>
          )
        )}
      </Modal>
    </div>
  );
}
