import { useState } from 'react';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';

export default function CrearTareaForm({ onTareaCreada }: { onTareaCreada?: () => void }) {
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion || !fecha || !horaInicio || !horaFin) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    if (horaInicio >= horaFin) {
      setMensaje('La hora de inicio debe ser menor que la hora de fin.');
      return;
    }

    try {
      await apiClient.post('/api/tareas', {
        descripcion,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin
      });
      setMensaje('¡Tarea creada con éxito!');
      setDescripcion('');
      setFecha('');
      setHoraInicio('');
      setHoraFin('');
      if (onTareaCreada) onTareaCreada();
    } catch (error: any) {
      setMensaje(error.response?.data?.mensaje || 'Error de red al intentar crear la tarea.');
    }
  };

  return (
    <div>
      <h3 className={styles.sectionTitle}>Crear Nueva Tarea</h3>

      {mensaje && (
        <p className={`${styles.message} ${mensaje.includes('éxito') ? styles.messageSuccess : styles.messageError}`}>
          {mensaje}
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="descripcion" className={`${styles.label} ${styles.required}`}>Descripción:</label>
          <input
            type="text"
            id="descripcion"
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Limpieza de altar"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="fecha" className={`${styles.label} ${styles.required}`}>Fecha:</label>
          <input
            type="date"
            id="fecha"
            className={styles.input}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="hora_inicio" className={`${styles.label} ${styles.required}`}>Hora de Inicio:</label>
            <input
              type="time"
              id="hora_inicio"
              className={styles.input}
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="hora_fin" className={`${styles.label} ${styles.required}`}>Hora de Fin:</label>
            <input
              type="time"
              id="hora_fin"
              className={styles.input}
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary">
          Crear Tarea
        </button>
      </form>
    </div>
  );
}
