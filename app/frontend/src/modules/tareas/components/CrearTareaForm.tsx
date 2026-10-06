import { useState } from 'react';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';
import { useToast } from '../../../context/ToastContext';

export default function CrearTareaForm({ onTareaCreada }: { onTareaCreada?: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo || !descripcion || !fecha || !horaInicio || !horaFin) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }

    if (horaInicio >= horaFin) {
      toast.error('Horario inválido', 'La hora de inicio debe ser menor que la hora de fin.');
      return;
    }

    try {
      await apiClient.post('/api/tareas', {
        titulo,
        descripcion,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin
      });
      toast.success('Tarea creada', `La tarea "${titulo}" ya está disponible para asignar.`);
      setTitulo('');
      setDescripcion('');
      setFecha('');
      setHoraInicio('');
      setHoraFin('');
      if (onTareaCreada) onTareaCreada();
    } catch (error: any) {
      toast.error('No se pudo crear la tarea', error.response?.data?.mensaje || 'Error de red al intentar crear la tarea.');
    }
  };

  return (
    <div>
      <h3 className={styles.sectionTitle}>Crear Nueva Tarea</h3>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="titulo" className={`${styles.label} ${styles.required}`}>Título:</label>
          <input
            type="text"
            id="titulo"
            className={styles.input}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Lectura primera"
          />
        </div>

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
