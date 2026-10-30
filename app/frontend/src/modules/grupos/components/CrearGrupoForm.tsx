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
  const [guardando, setGuardando] = useState(false);

  const [cargandoCoordinadores, setCargandoCoordinadores] = useState(true);
  const [errorCoordinadores, setErrorCoordinadores] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargandoCoordinadores(true);
    setErrorCoordinadores(false);
    apiClient.get<Persona[]>('/api/personas/coordinadores-grupo')
      .then(res => { if (vigente) setPersonas(res.data); })
      .catch(() => { if (vigente) setErrorCoordinadores(true); })
      .finally(() => { if (vigente) setCargandoCoordinadores(false); });
    return () => { vigente = false; };
  }, [revision]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando || cargandoCoordinadores || errorCoordinadores) return;

    if (!nombre.trim() || !coordinadorIds.length) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }

    setGuardando(true);
    try {
      await apiClient.post('/api/grupos', { nombre: nombre.trim(), coordinador_ids: coordinadorIds });
      toast.success('Grupo creado', `El grupo "${nombre}" ya está disponible.`);
      setNombre('');
      setCoordinadorIds([]);
      if (onGrupoCreado) onGrupoCreado();
    } catch (error: unknown) {
      toast.error('No se pudo crear el grupo', getApiErrorMessage(error, 'Error de red al intentar crear el grupo.'));
    } finally { setGuardando(false); }
  };

  return (
    <div>


      <form onSubmit={handleSubmit} className={styles.form}>
        <p className={styles.fieldNote}>Escribe el nombre del grupo y selecciona uno o varios coordinadores entre las cuentas habilitadas para ese rol. Cada coordinador solo puede estar a cargo de un grupo.</p>
        <div className={styles.field}>
          <label htmlFor="nombre" className={styles.label}>Nombre del Grupo:</label>
          <input
            type="text"
            maxLength={200}
            id="nombre"
            className={styles.input} disabled={guardando}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Coro Parroquial"
          />
        </div>

        <SelectorCoordinadoresGrupo personas={personas} seleccionados={coordinadorIds} onChange={setCoordinadorIds} cargando={cargandoCoordinadores} error={errorCoordinadores} onRetry={() => setRevision(value => value + 1)} disabled={guardando} />

        <button type="submit" className="btn-primary" disabled={guardando || cargandoCoordinadores || errorCoordinadores}>
          {guardando ? 'Creando…' : 'Crear Grupo'}
        </button>
      </form>
    </div>
  );
}
