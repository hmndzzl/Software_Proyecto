import { useState, type FormEvent } from 'react';
import { crearCuentaApi } from '../../api/cuentas';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/ui/Modal';
import Btn from '../../components/ui/Btn';
import { Field, InputUI, SelectUI } from '../../components/ui/Field';
import { ROLES } from '../../utils/roles';
import styles from './CuentasPage.module.css';

const PASSWORD_MIN = 8;

interface Props {
  open: boolean;
  roles: { id: number; label: string }[];
  onClose: () => void;
  onCreada: (nombre: string, rolId: number, advertencia?: string) => void;
}

export default function NuevaCuentaModal({ open, roles, onClose, onCreada }: Props) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [rolId, setRolId] = useState<number>(ROLES.MINISTRO);
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);

  const cerrar = () => {
    setNombre('');
    setCorreo('');
    setPassword('');
    setRolId(ROLES.MINISTRO);
    onClose();
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();

    if (!nombre.trim() || !correo.trim()) {
      toast.error('Faltan datos', 'Completa el nombre y el correo.');
      return;
    }
    if (password.length < PASSWORD_MIN) {
      toast.error('Contraseña muy corta', `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
      return;
    }

    setEnviando(true);
    try {
      const { advertencia } = await crearCuentaApi({ nombre: nombre.trim(), correo: correo.trim(), password, rol_id: rolId });
      const creada = nombre.trim();
      const rolCreado = rolId;
      cerrar();
      onCreada(creada, rolCreado, advertencia);
    } catch (err: any) {
      toast.error('No se pudo crear la cuenta', err.response?.data?.mensaje || 'Intenta de nuevo en unos momentos.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal open={open} title="Nueva cuenta" onClose={cerrar}>
      <form onSubmit={enviar} className={styles.form} noValidate>
        <Field label="Nombre completo" required>
          <InputUI aria-label="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} autoComplete="off" />
        </Field>
        <Field label="Correo electrónico" required>
          <InputUI aria-label="Correo electrónico" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} maxLength={100} autoComplete="off" />
        </Field>
        <Field label="Contraseña inicial" required hint={`Mínimo ${PASSWORD_MIN} caracteres. Compártela con la persona de forma segura.`}>
          <InputUI aria-label="Contraseña inicial" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Rol" required>
          <SelectUI aria-label="Rol de la nueva cuenta" value={rolId} onChange={(e) => setRolId(Number(e.target.value))}>
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>{rol.label}</option>
            ))}
          </SelectUI>
        </Field>

        <div className={styles.confirmAcciones}>
          <Btn type="button" kind="ghost" onClick={cerrar}>Cancelar</Btn>
          <Btn type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cuenta'}</Btn>
        </div>
      </form>
    </Modal>
  );
}
