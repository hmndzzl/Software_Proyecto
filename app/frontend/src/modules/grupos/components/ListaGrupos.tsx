import { useEffect, useState } from 'react';
import { Grupo } from '../../../types';
import { ROLES, usuarioTieneRol } from '../../../utils/roles';

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

  useEffect(() => {
    const fetchGrupos = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grupos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setGrupos(data);
        } else {
          setError('Error al cargar los grupos.');
        }
      } catch {
        setError('Error de red al obtener los grupos.');
      } finally {
        setLoading(false);
      }
    };
    fetchGrupos();
  }, [refreshKey]);

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Lista de Grupos</h3>

      {loading && <p style={{ color: '#555', fontSize: '14px' }}>Cargando grupos...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && grupos.length === 0 && (
        <p style={{ color: '#777', fontSize: '14px' }}>No hay grupos registrados.</p>
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
                        <button
                          onClick={() => onEditar(g)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #ccc',
                            borderRadius: '50px',
                            padding: '6px 14px',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            color: '#333'
                          }}
                        >
                          Editar
                        </button>
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