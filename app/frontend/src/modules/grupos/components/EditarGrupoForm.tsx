import { useState, useEffect } from 'react';
import { Grupo, Persona } from '../../../types';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import SelectorCoordinadoresGrupo from './SelectorCoordinadoresGrupo';

export default function EditarGrupoForm({
  grupo,
  onGrupoActualizado,
  onCancelar
}: {
  grupo: Grupo;
  onGrupoActualizado?: () => void;
  onCancelar?: () => void;
}) {
  const [nombre, setNombre] = useState(grupo.nombre);
  const [coordinadorIds, setCoordinadorIds] = useState<number[]>(grupo.coordinadores.map((c) => c.id));
  const [personas, setPersonas] = useState<Persona[]>([]);
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setNombre(grupo.nombre);
    setCoordinadorIds(grupo.coordinadores.map((c) => c.id));
  }, [grupo]);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando || cargandoCoordinadores || errorCoordinadores) return;

    if (!nombre.trim() || !coordinadorIds.length) {
      toast.error('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }

    setGuardando(true);
    try {
      await apiClient.put(`/api/grupos/${grupo.id}`, { nombre: nombre.trim(), coordinador_ids: coordinadorIds });
      toast.success('Grupo actualizado', `Los cambios en "${nombre}" se guardaron.`);
      if (onGrupoActualizado) onGrupoActualizado();
    } catch (error: unknown) {
      toast.error('No se pudo actualizar el grupo', getApiErrorMessage(error, 'Error de red al intentar actualizar el grupo.'));
    } finally { setGuardando(false); }
  };

  return (
    <form onSubmit={handleUpdate} className={styles.form}>
      <p className={styles.fieldNote}>Revisa el nombre y los coordinadores antes de guardar. Cada coordinador solo puede estar a cargo de un grupo.</p>
      <div className={styles.field}>
        <label htmlFor="edit-nombre" className={styles.label}>Nombre del Grupo:</label>
        <input
          type="text"
            maxLength={200}
          id="edit-nombre"
          className={styles.input} disabled={guardando}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <SelectorCoordinadoresGrupo personas={personas} seleccionados={coordinadorIds} onChange={setCoordinadorIds} cargando={cargandoCoordinadores} error={errorCoordinadores} onRetry={() => setRevision(value => value + 1)} disabled={guardando} />

      <div className={styles.buttonRow}>
        <button type="submit" className="btn-primary" disabled={guardando || cargandoCoordinadores || errorCoordinadores}>
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className={styles.btnSecondary} disabled={guardando}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
