import { useState, useEffect } from 'react';
import { Grupo, Persona } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import SelectorCoordinadoresGrupo from './SelectorCoordinadoresGrupo';

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
  const [coordinadorIds, setCoordinadorIds] = useState<number[]>(grupo.coordinadores.map((c) => c.id));
  const [personas, setPersonas] = useState<Persona[]>([]);
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setNombre(grupo.nombre);
    setCoordinadorIds(grupo.coordinadores.map((c) => c.id));
  }, [grupo]);

  useEffect(() => {
    apiClient.get<Persona[]>('/api/personas/coordinadores-grupo')
      .then(res => setPersonas(res.data))
      .catch(() => toast.error('No se pudieron cargar los datos', 'Error al cargar la lista de coordinadores.'));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    if (!nombre || !coordinadorIds.length) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }

    setGuardando(true);
    try {
      await apiClient.put(`/api/grupos/${grupo.id}`, { nombre, coordinador_ids: coordinadorIds });
      toast.success('Grupo actualizado', `Los cambios en "${nombre}" se guardaron.`);
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: unknown) {
      toast.error('No se pudo actualizar el grupo', getApiErrorMessage(error, 'Error de red al intentar actualizar el grupo.'));
    } finally { setGuardando(false); }
  };

  return (
    <form onSubmit={handleUpdate} className={styles.form}>
      <p className={styles.fieldNote}>Revisa el nombre y los coordinadores antes de guardar.</p>
      <div className={styles.field}>
        <label htmlFor="edit-nombre" className={styles.label}>Nombre del Grupo:</label>
        <input
          type="text"
          id="edit-nombre"
          className={styles.input} disabled={guardando}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <SelectorCoordinadoresGrupo personas={personas} seleccionados={coordinadorIds} onChange={setCoordinadorIds} disabled={guardando} />

      <div className={styles.buttonRow}>
        <button type="submit" className="btn-primary" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className={styles.btnSecondary} disabled={guardando}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
