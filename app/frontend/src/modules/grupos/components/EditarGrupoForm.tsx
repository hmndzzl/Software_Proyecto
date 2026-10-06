import { useState, useEffect } from 'react';
import { Grupo, Persona } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';
import { useToast } from '../../../context/ToastContext';

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

  useEffect(() => {
    setNombre(grupo.nombre);
    setCoordinadorId(String(grupo.coordinador_id));
  }, [grupo]);

  useEffect(() => {
    apiClient.get('/api/personas/coordinadores-grupo')
      .then(res => setPersonas(res.data))
      .catch(() => toast.error('No se pudieron cargar los datos', 'Error al cargar la lista de coordinadores.'));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !coordinadorId) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.put(`/api/grupos/${grupo.id}`, { nombre, coordinador_id: parseInt(coordinadorId) });
      toast.success('Grupo actualizado', `Los cambios en "${nombre}" se guardaron.`);
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: any) {
      toast.error('No se pudo actualizar el grupo', error.response?.data?.mensaje || 'Error de red al intentar actualizar el grupo.');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el grupo "${grupo.nombre}"?`)) return;

    try {
      await apiClient.delete(`/api/grupos/${grupo.id}`);
      toast.success('Grupo eliminado', `El grupo "${grupo.nombre}" fue eliminado.`);
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: any) {
      toast.error('No se pudo eliminar el grupo', error.response?.data?.mensaje || 'Error de red al intentar eliminar el grupo.');
    }
  };

  return (
    <div className={styles.editSection}>
      <h3 className={styles.sectionTitle}>Editar Grupo</h3>

      <form onSubmit={handleUpdate} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="edit-nombre" className={styles.label}>Nombre del Grupo:</label>
          <input
            type="text"
            id="edit-nombre"
            className={styles.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="edit-coordinador" className={styles.label}>Coordinador:</label>
          <select
            id="edit-coordinador"
            className={styles.input}
            value={coordinadorId}
            onChange={(e) => setCoordinadorId(e.target.value)}
          >
            <option value="">-- Elige un coordinador --</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.buttonRow}>
          <button type="submit" className="btn-primary">
            Guardar Cambios
          </button>
          <button type="button" onClick={handleDelete} className={styles.btnDanger}>
            Eliminar
          </button>
          {onCancelar && (
            <button type="button" onClick={onCancelar} className={styles.btnSecondary}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
