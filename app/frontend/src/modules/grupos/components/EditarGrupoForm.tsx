import { useState, useEffect } from 'react';
import { Grupo, Persona } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';

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
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    setNombre(grupo.nombre);
    setCoordinadorId(String(grupo.coordinador_id));
    setMensaje('');
  }, [grupo]);

  useEffect(() => {
    apiClient.get('/api/personas/coordinadores-grupo')
      .then(res => setPersonas(res.data))
      .catch(() => setMensaje('Error al cargar la lista de coordinadores.'));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !coordinadorId) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.put(`/api/grupos/${grupo.id}`, { nombre, coordinador_id: parseInt(coordinadorId) });
      setMensaje('¡Grupo actualizado con éxito!');
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar actualizar el grupo.');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el grupo "${grupo.nombre}"?`)) return;

    try {
      await apiClient.delete(`/api/grupos/${grupo.id}`);
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar eliminar el grupo.');
    }
  };

  return (
    <div className={styles.editSection}>
      <h3 className={styles.sectionTitle}>Editar Grupo</h3>

      {mensaje && (
        <p className={`${styles.message} ${mensaje.includes('éxito') ? styles.messageSuccess : styles.messageError}`}>
          {mensaje}
        </p>
      )}

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
