import { useState, useEffect } from 'react';
import { Grupo, Persona } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

export default function EditarGrupoForm({
  grupo,
  onGrupoActualizado,
  onCancelar
}: {
  grupo: Grupo;
  onGrupoActualizado?: () => void;
  onCancelar?: () => void;
}) {
  const [nombre, setNombre] = useState(grupo.nombre);
  const [coordinadorId, setCoordinadorId] = useState(String(grupo.coordinador_id));
  const [personas, setPersonas] = useState<Persona[]>([]);
  const toast = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    setNombre(grupo.nombre);
    setCoordinadorId(String(grupo.coordinador_id));
  }, [grupo]);

  useEffect(() => {
    apiClient.get<Persona[]>('/api/personas/coordinadores-grupo')
      .then(res => setPersonas(res.data))
      .catch(() => toast.error('No se pudieron cargar los datos', 'Error al cargar la lista de coordinadores.'));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eliminando) return;

    if (!nombre || !coordinadorId) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.put(`/api/grupos/${grupo.id}`, { nombre, coordinador_id: parseInt(coordinadorId) });
      toast.success('Grupo actualizado', `Los cambios en "${nombre}" se guardaron.`);
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: unknown) {
      toast.error('No se pudo actualizar el grupo', getApiErrorMessage(error, 'Error de red al intentar actualizar el grupo.'));
    }
  };

  const handleDelete = async () => {
    if (eliminando) return;
    setEliminando(true);

    try {
      await apiClient.delete(`/api/grupos/${grupo.id}`);
      toast.success('Grupo eliminado', `El grupo "${grupo.nombre}" fue eliminado.`);
      setConfirmando(false);
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: unknown) {
      toast.error('No se pudo eliminar el grupo', getApiErrorMessage(error, 'Error de red al intentar eliminar el grupo.'));
    } finally { setEliminando(false); }
  };

  return (
    <div className={styles.editSection}>


      <form onSubmit={handleUpdate} className={styles.form}>
        <p className={styles.fieldNote}>Revisa el nombre y el coordinador antes de guardar. Eliminar el grupo es una acción independiente.</p>
        <div className={styles.field}>
          <label htmlFor="edit-nombre" className={styles.label}>Nombre del Grupo:</label>
          <input
            type="text"
            id="edit-nombre"
            className={styles.input} disabled={eliminando}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="edit-coordinador" className={styles.label}>Coordinador:</label>
          <select
            id="edit-coordinador"
            className={styles.input} disabled={eliminando}
            data-placeholder={coordinadorId === '' ? 'true' : undefined}
            value={coordinadorId}
            onChange={(e) => setCoordinadorId(e.target.value)}
          >
            <option value="" disabled hidden>Selecciona un coordinador</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.buttonRow}>
          <button type="submit" className="btn-primary" disabled={eliminando}>
            Guardar Cambios
          </button>
          <button type="button" onClick={() => setConfirmando(true)} className={styles.btnDanger} disabled={eliminando}>
            Eliminar
          </button>
          {onCancelar && (
            <button type="button" onClick={onCancelar} className={styles.btnSecondary} disabled={eliminando}>
              Cancelar
            </button>
          )}
        </div>
      </form>
      <ConfirmDialog open={confirmando} title="Eliminar grupo" confirmLabel="Eliminar grupo"
        description={`¿Estás seguro de que deseas eliminar el grupo "${grupo.nombre}"?`} busy={eliminando}
        onCancel={() => setConfirmando(false)} onConfirm={handleDelete} />
    </div>
  );
}
