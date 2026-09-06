import { useState, useEffect } from 'react';
import apiClient from '../../../api/client';
import { formatFecha } from '../../../utils/date';
import EmptyState from '../../../components/ui/EmptyState';
import styles from '../../../styles/Form.module.css';

interface MiTarea {
  id: number;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

interface Ministro {
  id: number;
  nombre: string;
}

export default function SolicitarCambioTurnoForm({ onSolicitudEnviada }: { onSolicitudEnviada?: () => void }) {
  const usuarioInfo = localStorage.getItem('usuario');
  const usuario = usuarioInfo ? JSON.parse(usuarioInfo) : null;

  const [misTareas, setMisTareas] = useState<MiTarea[]>([]);
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [tareaId, setTareaId] = useState('');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!usuario) return;

    apiClient.get('/api/tareas', { params: { persona_id: usuario.id } })
      .then(res => setMisTareas(res.data))
      .catch(() => {});

    apiClient.get('/api/personas')
      .then(res => setMinistros(res.data.filter((m: Ministro) => m.id !== usuario.id)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tareaId || !destinatarioId) {
      setMensaje('Selecciona la tarea y el ministro con quien quieres hacer el cambio.');
      return;
    }

    setLoading(true);
    setMensaje('');

    try {
      const res = await apiClient.post('/api/cambios-turno', {
        tarea_id: Number(tareaId),
        destinatario_id: Number(destinatarioId),
      });
      setMensaje(res.data.mensaje || '¡Solicitud de cambio de turno enviada!');
      setTareaId('');
      setDestinatarioId('');
      if (onSolicitudEnviada) onSolicitudEnviada();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al solicitar el cambio de turno.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className={styles.sectionTitle}>Solicitar Cambio de Turno</h3>

      {mensaje && (
        <p className={`${styles.message} ${mensaje.includes('enviada') ? styles.messageSuccess : styles.messageError}`}>
          {mensaje}
        </p>
      )}

      {misTareas.length === 0 ? (
        <EmptyState message="No tienes tareas asignadas actualmente para solicitar un cambio." />
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="mi_tarea" className={`${styles.label} ${styles.required}`}>Mi Tarea:</label>
            <select
              id="mi_tarea"
              className={styles.input}
              value={tareaId}
              onChange={(e) => setTareaId(e.target.value)}
            >
              <option value="">-- Elige una de tus tareas --</option>
              {misTareas.map((tarea) => (
                <option key={tarea.id} value={tarea.id}>
                  {tarea.descripcion} · {formatFecha(tarea.fecha)} · {tarea.hora_inicio.substring(0, 5)}-{tarea.hora_fin.substring(0, 5)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="destinatario" className={`${styles.label} ${styles.required}`}>Cambiar con:</label>
            <select
              id="destinatario"
              className={styles.input}
              value={destinatarioId}
              onChange={(e) => setDestinatarioId(e.target.value)}
            >
              <option value="">-- Elige un ministro --</option>
              {ministros.map((ministro) => (
                <option key={ministro.id} value={ministro.id}>{ministro.nombre}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Solicitar Cambio'}
          </button>
        </form>
      )}
    </div>
  );
}
