import { useState, useEffect } from 'react';
import { Persona } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import SelectorCoordinadoresGrupo from './SelectorCoordinadoresGrupo';

export default function CrearGrupoForm({ onGrupoCreado }: { onGrupoCreado?: () => void }) {
  const [nombre, setNombre] = useState('');
  const [coordinadorIds, setCoordinadorIds] = useState<number[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const toast = useToast();

  useEffect(() => {
    apiClient.get<Persona[]>('/api/personas/coordinadores-grupo')
      .then(res => setPersonas(res.data))
      .catch(() => toast.error('No se pudieron cargar los datos', 'Error al cargar la lista de coordinadores.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !coordinadorIds.length) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }

    try {
      await apiClient.post('/api/grupos', { nombre, coordinador_ids: coordinadorIds });
      toast.success('Grupo creado', `El grupo "${nombre}" ya está disponible.`);
      setNombre('');
      setCoordinadorIds([]);
      if (onGrupoCreado) onGrupoCreado();
    } catch (error: unknown) {
      toast.error('No se pudo crear el grupo', getApiErrorMessage(error, 'Error de red al intentar crear el grupo.'));
    }
  };

  return (
    <div>


      <form onSubmit={handleSubmit} className={styles.form}>
        <p className={styles.fieldNote}>Escribe el nombre del grupo y selecciona uno o varios coordinadores entre las cuentas habilitadas para ese rol.</p>
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

        <SelectorCoordinadoresGrupo personas={personas} seleccionados={coordinadorIds} onChange={setCoordinadorIds} />

        <button type="submit" className="btn-primary">
          Crear Grupo
        </button>
      </form>
    </div>
  );
}
