import { useEffect, useState } from 'react';
import { Grupo } from '../../../types';
import apiClient from '../../../api/client';
import { ROLES, usuarioTieneRol } from '../../../utils/roles';
import { CardHead } from '../../../components/ui/Card';
import Btn from '../../../components/ui/Btn';
import SortableTh from '../../../components/ui/SortableTh';
import { useSortableTable } from '../../../hooks/useSortableTable';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import styles from './ListaGrupos.module.css';

type SortKey = 'id' | 'nombre' | 'coordinador';

const SORT_VALUE: Record<SortKey, (g: Grupo) => string | number> = {
  id: (g) => g.id,
  nombre: (g) => g.nombre.toLowerCase(),
  coordinador: (g) => (g.nombre_coordinador ?? '').toLowerCase(),
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

  const { sortKey, sortDir, toggleSort, sortedData: gruposOrdenados } = useSortableTable(grupos, SORT_VALUE);

  const puedeEditar = usuarioTieneRol([
    ROLES.SACERDOTE,
    ROLES.COORDINADOR_GRUPOS,
  ]);

  const fetchGrupos = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/grupos');
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
                <SortableTh label="Coordinador" sortKey="coordinador" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                {puedeEditar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {gruposOrdenados.map((g) => (
                <tr key={g.id}>
                  <td>{g.id}</td>
                  <td>{g.nombre}</td>
                  <td>{g.nombre_coordinador}</td>
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
    </div>
  );
}
