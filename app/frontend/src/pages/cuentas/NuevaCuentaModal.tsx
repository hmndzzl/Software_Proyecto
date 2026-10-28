import { useId, useState, type FormEvent } from 'react';
import { crearCuentaApi } from '../../api/cuentas';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/ui/Modal';
import Btn from '../../components/ui/Btn';
import PasswordInput from '../../components/ui/PasswordInput';
import { Field, InputUI, SelectUI } from '../../components/ui/Field';
import { ROLES } from '../../utils/roles';
import { getApiErrorMessage } from '../../utils/apiError';
import { normalizarTelefono } from '../../utils/telefono';
import styles from './CuentasPage.module.css';

const PASSWORD_MIN = 8;

interface Props {
  open: boolean;
  roles: { id: number; label: string }[];
  onClose: () => void;
  onCreada: (nombre: string, rolId: number, advertencia?: string) => void;
}

export default function NuevaCuentaModal({ open, roles, onClose, onCreada }: Props) {
  const fieldId = useId();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRevision, setPasswordRevision] = useState(0);
  const [rolId, setRolId] = useState<number>(ROLES.MINISTRO);
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);

  const cerrar = () => {
    setNombre('');
    setCorreo('');
    setTelefono('');
    setPassword('');
    setPasswordRevision(previous => previous + 1);
    setRolId(ROLES.MINISTRO);
    onClose();
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    if (!nombre.trim() || !correo.trim()) {
      toast.error('Faltan datos', 'Completa el nombre y el correo.');
      return;
    }
    if (password.length < PASSWORD_MIN) {
      toast.error('Contraseña muy corta', `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      toast.error('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }
    let numero: string;
    try { numero = normalizarTelefono(telefono); }
    catch (error) { toast.error('Teléfono inválido', (error as Error).message); return; }

    setEnviando(true);
    try {
      const { advertencia } = await crearCuentaApi({ nombre: nombre.trim(), correo: correo.trim(), password, rol_id: rolId, ...(numero ? { telefono: numero } : {}) });
      const creada = nombre.trim();
      const rolCreado = rolId;
      cerrar();
      onCreada(creada, rolCreado, advertencia);
    } catch (err: unknown) {
      toast.error('No se pudo crear la cuenta', getApiErrorMessage(err, 'Intenta de nuevo en unos momentos.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal open={open} title="Nueva cuenta" onClose={() => { if (!enviando) cerrar(); }}>
      <form onSubmit={enviar} className={styles.form} noValidate>
        <p>Registra los datos personales y el rol de acceso. El teléfono es opcional.</p>
        <Field label="Nombre completo" htmlFor={`${fieldId}-nombre`} required>
          <InputUI aria-required="true" id={`${fieldId}-nombre`} aria-label="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} autoComplete="off" />
        </Field>
        <Field label="Correo electrónico" htmlFor={`${fieldId}-correo`} required>
          <InputUI aria-required="true" id={`${fieldId}-correo`} aria-label="Correo electrónico" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} maxLength={100} autoComplete="off" />
        </Field>
        <Field label="Teléfono (opcional)" htmlFor={`${fieldId}-telefono`} hint="Acepta 8 dígitos locales o un número internacional con + y código de país.">
          <InputUI aria-describedby={`${fieldId}-telefono-hint`} id={`${fieldId}-telefono`} aria-label="Teléfono (opcional)" type="tel" autoComplete="tel" maxLength={50} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+502 5555 1234" disabled={enviando} />
        </Field>
        <Field label="Contraseña inicial" htmlFor={`${fieldId}-password`} required hint={`Mínimo ${PASSWORD_MIN} caracteres. Compártela con la persona de forma segura.`}>
          <PasswordInput aria-required="true" aria-describedby={`${fieldId}-password-hint`} id={`${fieldId}-password`} key={passwordRevision} aria-label="Contraseña inicial" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" disabled={enviando} />
        </Field>
        <Field label="Rol" htmlFor={`${fieldId}-rol`} required>
          <SelectUI aria-required="true" id={`${fieldId}-rol`} aria-label="Rol de la nueva cuenta" value={rolId} onChange={(e) => setRolId(Number(e.target.value))}>
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>{rol.label}</option>
            ))}
          </SelectUI>
        </Field>

        <div className={styles.confirmAcciones}>
          <Btn type="button" kind="ghost" onClick={cerrar} disabled={enviando}>Cancelar</Btn>
          <Btn type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cuenta'}</Btn>
        </div>
      </form>
    </Modal>
  );
}
