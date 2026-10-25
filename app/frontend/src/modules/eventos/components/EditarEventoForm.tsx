import { useState, useEffect, useRef } from 'react';
import { Evento, Persona } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

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
  const [publico, setPublico] = useState(Boolean(evento.publico));
  const [guardando, setGuardando] = useState(false);
  const datosPersistidos = useRef({ descripcion: evento.descripcion, encargado_id: evento.encargado_id });
  const toast = useToast();

  useEffect(() => {
    setDescripcion(evento.descripcion);
    setEncargadoId(String(evento.encargado_id));
    setPublico(Boolean(evento.publico));
    datosPersistidos.current = { descripcion: evento.descripcion, encargado_id: evento.encargado_id };
  }, [evento]);

  useEffect(() => {
    apiClient.get<Persona[]>('/api/personas/encargados-evento')
      .then(res => setPersonas(res.data))
      .catch(() => toast.error('No se pudieron cargar los datos', 'Error al cargar las personas disponibles.'));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    if (!descripcion || !encargadoId) {
      toast.error('Faltan datos', 'La descripción y el encargado son requeridos.');
      return;
    }

    let datosGuardados = false;
    setGuardando(true);
    try {
      if (descripcion !== datosPersistidos.current.descripcion || Number(encargadoId) !== datosPersistidos.current.encargado_id) {
        await apiClient.put(`/api/eventos/${evento.id}`, {
          descripcion,
          encargado_id: Number(encargadoId),
        });
        datosGuardados = true;
        datosPersistidos.current = { descripcion, encargado_id: Number(encargadoId) };
      }
      if (publico !== Boolean(evento.publico)) {
        await apiClient.patch(`/api/eventos/${evento.id}/publico`, { publico });
      }
      toast.success('Evento actualizado', `Los cambios en "${descripcion}" se guardaron.`);
      if (onEventoActualizado) onEventoActualizado();
    } catch (error: unknown) {
      toast.error(
        datosGuardados ? 'La visibilidad no se guardó' : 'No se pudo actualizar el evento',
        datosGuardados
          ? 'La descripción y el encargado se guardaron, pero la visibilidad no pudo confirmarse. Reintenta guardar.'
          : getApiErrorMessage(error, 'Error de red al intentar actualizar el evento.'),
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el evento "${evento.descripcion}"?`)) return;

    try {
      await apiClient.delete(`/api/eventos/${evento.id}`);
      toast.success('Evento eliminado', `El evento "${evento.descripcion}" fue eliminado.`);
      if (onEventoActualizado) onEventoActualizado();
    } catch (error: unknown) {
      toast.error('No se pudo eliminar el evento', getApiErrorMessage(error, 'Error de red al intentar eliminar el evento.'));
    }
  };

  return (
    <div className={styles.editSection}>


      <form onSubmit={handleUpdate} className={styles.form} aria-busy={guardando}>
        <div className={styles.field}>
          <label htmlFor="editar-evento-descripcion" className={styles.label}>Descripción:</label>
          <input
            id="editar-evento-descripcion"
            type="text"
            disabled={guardando}
            className={styles.input}
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="editar-evento-encargado" className={styles.label}>Encargado:</label>
          <select
            id="editar-evento-encargado"
            disabled={guardando}
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

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={publico}
              onChange={e => setPublico(e.target.checked)}
              disabled={guardando}
              aria-describedby="publico-ayuda"
            />
            Mostrar en la agenda pública
          </label>
          <p id="publico-ayuda" className={styles.fieldNote}>
            Aparecerá en la agenda pública si su reserva está confirmada y el evento aún no ha terminado.
            Al desmarcar esta opción y guardar, dejará de mostrarse.
          </p>
        </div>

        <div className={styles.buttonRow}>
          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar Cambios'}
          </button>
          <button type="button" onClick={handleDelete} className={styles.btnDanger} disabled={guardando}>
            Eliminar
          </button>
          {onCancelar && (
            <button type="button" onClick={onCancelar} className={styles.btnSecondary} disabled={guardando}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
