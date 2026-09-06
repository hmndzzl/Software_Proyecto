import { useState, useEffect } from 'react';
import { Evento, Persona } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';

export default function EditarEventoForm({
  evento,
  onEventoActualizado,
  onCancelar,
}: {
  evento: Evento;
  onEventoActualizado?: () => void;
  onCancelar?: () => void;
}) {
  const [descripcion, setDescripcion] = useState(evento.descripcion);
  const [encargadoId, setEncargadoId] = useState(String(evento.encargado_id));
  const [personas, setPersonas]       = useState<Persona[]>([]);
  const [mensaje, setMensaje]         = useState('');

  useEffect(() => {
    setDescripcion(evento.descripcion);
    setEncargadoId(String(evento.encargado_id));
    setMensaje('');
  }, [evento]);

  useEffect(() => {
    apiClient.get('/api/personas/encargados-evento')
      .then(res => setPersonas(res.data))
      .catch(() => setMensaje('Error al cargar las personas disponibles.'));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion || !encargadoId) {
      setMensaje('La descripción y el encargado son requeridos.');
      return;
    }

    try {
      await apiClient.put(`/api/eventos/${evento.id}`, {
        descripcion,
        encargado_id: Number(encargadoId),
      });
      setMensaje('¡Evento actualizado con éxito!');
      if (onEventoActualizado) onEventoActualizado();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar actualizar el evento.');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el evento "${evento.descripcion}"?`)) return;

    try {
      await apiClient.delete(`/api/eventos/${evento.id}`);
      if (onEventoActualizado) onEventoActualizado();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar eliminar el evento.');
    }
  };

  return (
    <div className={styles.editSection}>
      <h3 className={styles.sectionTitle}>Editar Evento</h3>

      {mensaje && (
        <p className={`${styles.message} ${mensaje.includes('éxito') ? styles.messageSuccess : styles.messageError}`}>
          {mensaje}
        </p>
      )}

      <form onSubmit={handleUpdate} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Descripción:</label>
          <input
            type="text"
            className={styles.input}
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Encargado:</label>
          <select
            className={styles.input}
            value={encargadoId}
            onChange={e => setEncargadoId(e.target.value)}
          >
            <option value="">-- Elige una persona --</option>
            {personas.map(persona => (
              <option key={persona.id} value={persona.id}>
                {persona.nombre}
              </option>
            ))}
          </select>
          {personas.length === 0 && (
            <p className={styles.fieldNote}>No se pudieron cargar las personas disponibles.</p>
          )}
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
