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

interface Props { espacio?: Espacio; onChanged: () => void; onDeleted?: () => void; }

export default function EspacioGestion({ espacio, onChanged, onDeleted }: Props) {
  const { tieneRol } = useAuth();
  const toast = useToast();
  const [editar, setEditar] = useState(false);
  const [eliminar, setEliminar] = useState(false);
  if (!tieneRol([ROLES.ADMIN, ROLES.SACERDOTE])) return null;

  return <div className={styles.actions} onClick={e => e.stopPropagation()}>
    <Btn type="button" kind={espacio ? 'ghost' : 'primary'} size={espacio ? 'sm' : 'md'} onClick={() => setEditar(true)}>
      {espacio ? 'Editar espacio' : 'Crear espacio'}
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
