import { useState, useEffect } from 'react';
import { Persona } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';
import { useToast } from '../../../context/ToastContext';

export default function CrearGrupoForm({ onGrupoCreado }: { onGrupoCreado?: () => void }) {
  const [nombre, setNombre] = useState('');
  const [coordinadorId, setCoordinadorId] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const toast = useToast();

  useEffect(() => {
    apiClient.get('/api/personas/coordinadores-grupo')
      .then(res => setPersonas(res.data))
      .catch(() => toast.error('No se pudieron cargar los datos', 'Error al cargar la lista de coordinadores.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !coordinadorId) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.post('/api/grupos', { nombre, coordinador_id: parseInt(coordinadorId) });
      toast.success('Grupo creado', `El grupo "${nombre}" ya está disponible.`);
      setNombre('');
      setCoordinadorId('');
      if (onGrupoCreado) onGrupoCreado();
    } catch (error: any) {
      toast.error('No se pudo crear el grupo', error.response?.data?.mensaje || 'Error de red al intentar crear el grupo.');
    }
  };

  return (
    <div>
      <h3 className={styles.sectionTitle}>Crear Nuevo Grupo</h3>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="nombre" className={styles.label}>Nombre del Grupo:</label>
          <input
            type="text"
            id="nombre"
            className={styles.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Coro Parroquial"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="coordinador" className={styles.label}>Coordinador:</label>
          <select
            id="coordinador"
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

        <button type="submit" className="btn-primary">
          Crear Grupo
        </button>
      </form>
    </div>
  );
}
