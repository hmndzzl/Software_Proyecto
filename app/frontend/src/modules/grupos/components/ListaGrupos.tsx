import { useEffect, useState } from 'react';
import { Grupo } from '../../../types';
import apiClient from '../../../api/client';
import { ROLES, usuarioTieneRol } from '../../../utils/roles';
import { CardHead } from '../../../components/ui/Card';
import Btn from '../../../components/ui/Btn';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import styles from './ListaGrupos.module.css';

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
                <th>#</th>
                <th>Nombre</th>
                <th>Coordinador</th>
                {puedeEditar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
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
