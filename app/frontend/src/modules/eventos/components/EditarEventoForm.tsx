import { useState, useEffect } from 'react';
import { Evento } from '../../../types';
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
  const [mensaje, setMensaje]         = useState('');

  useEffect(() => {
    setDescripcion(evento.descripcion);
    setMensaje('');
  }, [evento]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion) {
      setMensaje('La descripción no puede estar vacía.');
      return;
    }

    try {
      await apiClient.put(`/api/eventos/${evento.id}`, { descripcion });
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
    <div style={{ borderTop: '1px solid #eee', paddingTop: '24px', marginTop: '8px' }}>
      <h3 style={{ marginBottom: '16px' }}>Editar Evento</h3>

      {mensaje && (
        <p className={`${styles.message} ${mensaje.includes('éxito') ? styles.messageSuccess : styles.messageError}`}>
          {mensaje}
        </p>
      )}

      <div className={styles.infoBox} style={{ marginBottom: '16px' }}>
        <span className={styles.infoBoxLabel}>Encargado:</span>
        <span>{evento.nombre_encargado}</span>
        <span className={styles.infoBoxNote}>(solicitante de la reserva)</span>
      </div>

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
