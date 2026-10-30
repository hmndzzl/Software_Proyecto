import { useEffect, useId, useState } from 'react';
import { Grupo } from '../../../types';
import apiClient from '../../../api/client';
import { ROLES } from '../../../utils/roles';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { CardHead } from '../../../components/ui/Card';
import Btn from '../../../components/ui/Btn';
import Modal from '../../../components/ui/Modal';
import { ConfirmDialogContent } from '../../../components/ui/ConfirmDialog';
import SortableTh from '../../../components/ui/SortableTh';
import TableFilters from '../../../components/ui/TableFilters';
import { useTableFilters } from '../../../hooks/useTableFilters';
import { useSortableTable } from '../../../hooks/useSortableTable';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import EditarGrupoForm from './EditarGrupoForm';
import styles from './ListaGrupos.module.css';

type SortKey = 'id' | 'nombre' | 'coordinador';
type Vista = 'detalle' | 'editar' | 'eliminar';

const SORT_VALUE: Record<SortKey, (g: Grupo) => string | number> = {
  id: (g) => g.id,
  nombre: (g) => g.nombre.toLowerCase(),
  coordinador: (g) => g.coordinadores.map((c) => c.nombre).sort().join(', ').toLowerCase(),
};

export default function ListaGrupos({ refreshKey }: { refreshKey?: number }) {
  const id = useId();
  const toast = useToast();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grupoActivo, setGrupoActivo] = useState<Grupo | null>(null);
  const [vista, setVista] = useState<Vista>('detalle');
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

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

  const abrir = (grupo: Grupo, destino: Vista = 'detalle') => {
    setGrupoActivo(grupo); setVista(destino); setErrorEliminar('');
  };
  const cerrar = () => {
    if (eliminando) return;
    setGrupoActivo(null); setVista('detalle'); setErrorEliminar('');
  };

  const eliminar = async () => {
    if (!grupoActivo || eliminando) return;
    setEliminando(true); setErrorEliminar('');
    try {
      await apiClient.delete(`/api/grupos/${grupoActivo.id}`);
      toast.success('Grupo eliminado', `El grupo "${grupoActivo.nombre}" fue eliminado.`);
      fetchGrupos();
      cerrar();
    } catch (err: unknown) {
      setErrorEliminar(getApiErrorMessage(err, 'No se pudo eliminar el grupo. Inténtalo de nuevo.'));
    } finally {
      setEliminando(false);
    }
  };

  const tituloModal = grupoActivo
    ? vista === 'editar' ? `Editar ${grupoActivo.nombre}` : vista === 'eliminar' ? 'Eliminar grupo' : grupoActivo.nombre
    : '';

  return (
    <div>
      <CardHead title="Lista de Grupos" hint={!loading && grupos.length > 0 ? `${grupos.length} grupos` : undefined} />
      {!loading && !error && <TableFilters {...filtros.controls} label="Filtros de grupos" />}

      {loading && <LoadingState variant="table" label="Cargando grupos..." />}
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
                <tr key={g.id} className={styles.fila} onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button, input, select')) return;
                  abrir(g);
                }}>
                  <td>{g.id}</td>
                  <td>
                    <button type="button" className={styles.enlace} onClick={() => abrir(g)}>{g.nombre}</button>
                  </td>
                  <td>
                    {!g.coordinadores.length ? 'Sin coordinador asignado' : <>
                      <span>{g.coordinadores.slice(0, 2).map((c) => c.nombre).join(', ')}</span>
                      {g.coordinadores.length > 2 && <>{' '}<button type="button" className={styles.enlace} onClick={() => abrir(g)}
                        aria-label={`Ver los ${g.coordinadores.length} coordinadores de ${g.nombre}`}>+{g.coordinadores.length - 2} más</button></>}
                    </>}
                  </td>
                  {puedeEditar && (
                    <td>
                      <Btn kind="ghost" size="sm" onClick={() => abrir(g, 'editar')}>
                        Editar
                      </Btn>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(grupoActivo)}
        title={tituloModal}
        returnLabel={vista === 'detalle' ? 'Volver a grupos' : undefined}
        onClose={cerrar}
        closeDisabled={eliminando}
        describedBy={vista === 'eliminar' ? `${id}-confirmacion` : undefined}
        initialFocusSelector={vista === 'eliminar' ? '[data-confirm-cancel]' : undefined}
        onBack={vista !== 'detalle' ? () => { if (!eliminando) { setVista('detalle'); setErrorEliminar(''); } } : undefined}
      >
        {grupoActivo && vista === 'detalle' && (
          <div className={styles.detalle}>
            <h3>Coordinadores asignados ({grupoActivo.coordinadores.length})</h3>
            {grupoActivo.coordinadores.length === 0 ? (
              <p className={styles.textoInfo}>Este grupo no tiene coordinadores asignados.</p>
            ) : (
              <ul className={styles.personas} aria-label="Coordinadores del grupo">
                {grupoActivo.coordinadores.map((c) => (
                  <li key={c.id} className={styles.persona}>
                    <span className={styles.avatar} aria-hidden="true">{c.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('')}</span>
                    <span>{c.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
            {puedeEditar && (
              <div className={styles.accionesTarjeta}>
                <Btn kind="ghost" size="sm" onClick={() => setVista('editar')}>Editar grupo</Btn>
                <Btn kind="bad" size="sm" onClick={() => setVista('eliminar')}>Eliminar grupo</Btn>
              </div>
            )}
          </div>
        )}
        {grupoActivo && vista === 'editar' && (
          <EditarGrupoForm
            grupo={grupoActivo}
            onGrupoActualizado={() => { fetchGrupos(); cerrar(); }}
            onCancelar={() => setVista('detalle')}
          />
        )}
        {grupoActivo && vista === 'eliminar' && (
          <>
            <ConfirmDialogContent
              description={`¿Estás seguro de que deseas eliminar el grupo "${grupoActivo.nombre}"?`}
              confirmLabel="Eliminar grupo"
              busy={eliminando}
              descriptionId={`${id}-confirmacion`}
              onCancel={() => { setVista('detalle'); setErrorEliminar(''); }}
              onConfirm={eliminar}
            />
            {errorEliminar && <p role="alert" className={styles.textoInfo}>{errorEliminar}</p>}
          </>
        )}
      </Modal>
    </div>
  );
}
