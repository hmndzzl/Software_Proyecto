import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ROLES } from '../../../utils/roles';
import Btn from '../../../components/ui/Btn';
import type { Espacio } from './EspacioCard';
import EspacioFormModal from './EspacioFormModal';
import styles from './EspacioGestion.module.css';

interface Props { espacio?: Espacio; onChanged: () => void; }

export default function EspacioGestion({ espacio, onChanged }: Props) {
  const { tieneRol } = useAuth();
  const toast = useToast();
  const [editar, setEditar] = useState(false);
  if (!tieneRol([ROLES.ADMIN, ROLES.SACERDOTE])) return null;

  return <div className={styles.actions} onClick={e => e.stopPropagation()}>
    <Btn type="button" kind={espacio ? 'ghost' : 'primary'} size={espacio ? 'sm' : 'md'} onClick={() => setEditar(true)}>
      {espacio ? 'Editar espacio' : 'Crear espacio'}
    </Btn>
    {editar && <EspacioFormModal espacio={espacio} onClose={() => setEditar(false)} onSaved={() => {
      setEditar(false);
      toast.success(espacio ? 'Espacio actualizado' : 'Espacio creado', 'Los datos del espacio se guardaron correctamente.');
      onChanged();
    }} />}
  </div>;
}
