import { useState, useEffect, useMemo } from 'react';
import apiClient from '../../../api/client';
import { formatFecha } from '../../../utils/date';
import styles from '../../../styles/Form.module.css';

interface AsignadoInfo {
  persona_id: number;
  nombre: string;
}

interface Tarea {
  id: number;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  asignados: AsignadoInfo[];
}

interface Persona {
  id: number;
  nombre: string;
  disponible: boolean;
}

// Debe coincidir con TOPE_SERVICIOS_MES en app/backend/src/config/constants.ts
const TOPE_SERVICIOS_MES = 8;

export default function AsignarTareaForm({ refreshKey, onAsignacionExitosa }: { refreshKey?: number, onAsignacionExitosa?: () => void }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<string>('');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');

  useEffect(() => {
    apiClient.get('/api/tareas')
      .then(res => setTareas(res.data))
      .catch(error => console.error(error));

    apiClient.get('/api/personas')
      .then(res => setPersonas(res.data))
      .catch(error => console.error(error));
  }, [refreshKey]);

  const tareaSeleccionadaObj = tareas.find((t) => String(t.id) === tareaSeleccionada);

  const conflictos = useMemo(() => {
    if (!tareaSeleccionadaObj || !personaSeleccionada) return [];
    const personaId = Number(personaSeleccionada);

    return tareas.filter((t) =>
      t.id !== tareaSeleccionadaObj.id &&
      t.fecha === tareaSeleccionadaObj.fecha &&
      t.asignados.some((a) => a.persona_id === personaId) &&
      t.hora_inicio < tareaSeleccionadaObj.hora_fin &&
      t.hora_fin > tareaSeleccionadaObj.hora_inicio
    );
  }, [tareas, tareaSeleccionadaObj, personaSeleccionada]);

  const personaSeleccionadaObj = personas.find((p) => String(p.id) === personaSeleccionada);
  const nombrePersonaSeleccionada = personaSeleccionadaObj?.nombre ?? 'Este ministro';

  // No bloquea el envío, solo informa antes de confirmar.
  const alertaRotacion = useMemo(() => {
    if (!tareaSeleccionadaObj || !personaSeleccionadaObj) return null;

    const mesAno = tareaSeleccionadaObj.fecha.slice(0, 7); // 'YYYY-MM'
    const otrosServiciosDelMes = tareas.filter((t) =>
      t.id !== tareaSeleccionadaObj.id &&
      t.fecha.slice(0, 7) === mesAno &&
      t.asignados.some((a) => a.persona_id === personaSeleccionadaObj.id)
    ).length;
    const serviciosProyectados = otrosServiciosDelMes + 1;

    const noDisponible = !personaSeleccionadaObj.disponible;
    const topeSuperado = serviciosProyectados > TOPE_SERVICIOS_MES;

    if (!noDisponible && !topeSuperado) return null;
    return { noDisponible, topeSuperado, serviciosProyectados };
  }, [tareaSeleccionadaObj, personaSeleccionadaObj, tareas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tareaSeleccionada || !personaSeleccionada) {
      setMensaje('Por favor, selecciona una tarea y un ministro.');
      return;
    }

    try {
      await apiClient.post('/api/tareas/asignar', {
        tarea_id: parseInt(tareaSeleccionada),
        persona_id: parseInt(personaSeleccionada)
      });
      setMensaje('¡Asignación guardada con éxito!');
      setTareaSeleccionada('');
      setPersonaSeleccionada('');
      if (onAsignacionExitosa) onAsignacionExitosa();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Hubo un error de red al intentar guardar la asignación.');
    }
  };

  return (
    <div>
      <h3 className={styles.sectionTitle}>Asignar Tarea a Ministro</h3>

      {mensaje && (
        <p className={`${styles.message} ${mensaje.includes('éxito') ? styles.messageSuccess : styles.messageError}`}>
          {mensaje}
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="tarea" className={`${styles.label} ${styles.required}`}>Seleccionar Tarea:</label>
          <select
            id="tarea"
            className={styles.input}
            value={tareaSeleccionada}
            onChange={(e) => setTareaSeleccionada(e.target.value)}
          >
            <option value="">-- Elige una tarea --</option>
            {tareas.map((tarea) => (
              <option key={tarea.id} value={tarea.id}>
                {tarea.descripcion}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="persona" className={`${styles.label} ${styles.required}`}>Seleccionar Ministro:</label>
          <select
            id="persona"
            className={styles.input}
            value={personaSeleccionada}
            onChange={(e) => setPersonaSeleccionada(e.target.value)}
          >
            <option value="">-- Elige un ministro --</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.nombre}
              </option>
            ))}
          </select>
        </div>

        {conflictos.length > 0 && tareaSeleccionadaObj && (
          <div className={styles.modalWarning}>
            <strong>Conflicto de horario:</strong> {nombrePersonaSeleccionada} ya tiene{' '}
            {conflictos.length === 1 ? 'otra tarea asignada' : `${conflictos.length} tareas asignadas`} el{' '}
            {formatFecha(tareaSeleccionadaObj.fecha)} en un horario que se cruza con este:
            <ul className={styles.conflictList}>
              {conflictos.map((c) => (
                <li key={c.id}>
                  {c.descripcion} · {c.hora_inicio.substring(0, 5)}–{c.hora_fin.substring(0, 5)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {alertaRotacion && (
          <div className={styles.modalWarning}>
            <strong>Alerta de rotación:</strong>
            <ul className={styles.conflictList}>
              {alertaRotacion.noDisponible && (
                <li>{nombrePersonaSeleccionada} está marcado como no disponible (enfermo, permiso, etc.).</li>
              )}
              {alertaRotacion.topeSuperado && (
                <li>
                  {nombrePersonaSeleccionada} tendría {alertaRotacion.serviciosProyectados} servicios este mes
                  (tope: {TOPE_SERVICIOS_MES}).
                </li>
              )}
            </ul>
          </div>
        )}

        <button type="submit" className="btn-primary">
          Guardar Asignación
        </button>
      </form>
    </div>
  );
}
