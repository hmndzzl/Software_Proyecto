import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ROLES } from '../../../utils/roles';
import Btn from '../../../components/ui/Btn';
import type { Espacio } from './EspacioCard';
import EspacioFormModal from './EspacioFormModal';
import EspacioEliminarModal from './EspacioEliminarModal';
import styles from './EspacioGestion.module.css';

interface Props { espacio?: Espacio; onChanged: () => void; onDeleted?: () => void; compact?: boolean; }

export default function EspacioGestion({ espacio, onChanged, onDeleted, compact = false }: Props) {
  const { tieneRol } = useAuth();
  const toast = useToast();
  const [editar, setEditar] = useState(false);
  const [eliminar, setEliminar] = useState(false);
  if (!tieneRol([ROLES.ADMIN, ROLES.SACERDOTE])) return null;

  return <div className={styles.actions} onClick={e => e.stopPropagation()}>
    <Btn type="button" className={espacio && compact ? styles.compactAction : undefined} icon={espacio && compact ? <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 5 5L9 20l-6 1 1-6L16 3Z" /><path d="m14 5 5 5" /></svg> : undefined} aria-label={espacio && compact ? 'Editar espacio' : undefined} kind={espacio ? 'ghost' : 'primary'} size={espacio ? 'sm' : 'md'} onClick={() => setEditar(true)}>
      {espacio ? compact ? 'Editar' : 'Editar espacio' : 'Crear espacio'}
    </Btn>
    {editar && createPortal(<EspacioFormModal espacio={espacio} open={!eliminar} onDelete={espacio ? () => setEliminar(true) : undefined} onClose={() => setEditar(false)} onSaved={() => {
      setEditar(false);
      toast.success(espacio ? 'Espacio actualizado' : 'Espacio creado', 'Los datos del espacio se guardaron correctamente.');
      onChanged();
    }} />, document.body)}
    {espacio && eliminar && createPortal(<EspacioEliminarModal espacio={espacio} onClose={() => setEliminar(false)} onDeleted={() => {
      setEliminar(false); setEditar(false);
      toast.success('Espacio eliminado', 'Se eliminó el espacio y se cancelaron las reservas afectadas, si las había.');
      (onDeleted ?? onChanged)();
    }} />, document.body)}
  </div>;
}
