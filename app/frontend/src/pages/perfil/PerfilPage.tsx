import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth, type Usuario } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import Btn from '../../components/ui/Btn';
import PasswordInput from '../../components/ui/PasswordInput';
import { getApiErrorMessage, getApiErrorStatus } from '../../utils/apiError';
import { normalizarTelefono } from '../../utils/telefono';
import form from '../../styles/Form.module.css';
import styles from './PerfilPage.module.css';

const ROL_LABEL: Record<number, string> = {
  1: 'Sacerdote',
  2: 'Coordinador de Ministros',
  3: 'Coordinador de Grupos',
  4: 'Ministro',
  5: 'Administrador',
};

interface FormState {
  nombre:    string;
  correo:    string;
  password:  string;
  confirmar: string;
}

interface PerfilActualizadoResponse {
  persona: Usuario & { telefono?: string | null };
}

export default function PerfilPage() {
  const { usuario, actualizarUsuario } = useAuth();

  // Formulario precargado 
  const [formData, setFormData] = useState<FormState>({
    nombre:    usuario?.nombre  ?? '',
    correo:    usuario?.correo  ?? '',
    password:  '',
    confirmar: '',
  });

  const [saving,  setSaving]  = useState(false);
  const [passwordRevision, setPasswordRevision] = useState(0);
  const [telefono, setTelefono] = useState('');
  const [telefonoOriginal, setTelefonoOriginal] = useState('');
  const [estadoTelefono, setEstadoTelefono] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [revisionTelefono, setRevisionTelefono] = useState(0);
  const toast = useToast();

  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    setEstadoTelefono('cargando');
    apiClient.get<{ telefono?: string | null }>(`/api/personas/${usuario.id}`)
      .then(res => { if (vigente) { setTelefono(res.data.telefono ?? ''); setTelefonoOriginal(res.data.telefono ?? ''); setEstadoTelefono('listo'); } })
      .catch(() => { if (vigente) setEstadoTelefono('error'); });
    return () => { vigente = false; };
  }, [usuario?.id, revisionTelefono]);

  // Sincroniza el formulario si el contexto cambia 
  useEffect(() => {
    if (!usuario) return;
    setFormData(prev => ({
      ...prev,
      nombre: prev.nombre || usuario.nombre,
      correo: prev.correo || usuario.correo,
    }));
  }, [usuario]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    let numero: string;
    try { numero = normalizarTelefono(telefono); }
    catch (error) { toast.error('Teléfono inválido', (error as Error).message); return; }

    if (formData.password && formData.password !== formData.confirmar) {
      toast.error('Revisa tus datos', 'Las contraseñas no coinciden.');
      return;
    }

    const body: Record<string, string> = {};
    if (formData.nombre.trim())  body.nombre   = formData.nombre.trim();
    if (formData.correo.trim())  body.correo   = formData.correo.trim();
    if (formData.password)       body.password = formData.password;
    if (estadoTelefono === 'listo' && numero !== telefonoOriginal) body.telefono = numero;

    if (Object.keys(body).length === 0) {
      toast.error('Sin cambios', 'No hay cambios para guardar.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.put<PerfilActualizadoResponse>(`/api/personas/${usuario!.id}`, body);
      const actualizado = res.data.persona;
      if (actualizado.telefono !== undefined) { setTelefono(actualizado.telefono ?? ''); setTelefonoOriginal(actualizado.telefono ?? ''); }

      // Actualizar la sesión para reflejar los cambios en toda la app
      actualizarUsuario({
        id:     actualizado.id,
        nombre: actualizado.nombre,
        correo: actualizado.correo,
        rol_id: actualizado.rol_id,
      });

      setFormData(prev => ({ ...prev, password: '', confirmar: '' }));
      setPasswordRevision(previous => previous + 1);
      toast.success('Perfil actualizado', 'Tus cambios se guardaron correctamente.');
    } catch (err: unknown) {
      if (getApiErrorStatus(err) === 409) {
        toast.error('No se pudo guardar el perfil', getApiErrorMessage(err, 'El correo o el teléfono ya está en uso por otra cuenta.'));
      } else {
        toast.error('No se pudo guardar el perfil', getApiErrorMessage(err, 'Error al actualizar el perfil. Inténtalo de nuevo.'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Cuenta"
        title="Mi Perfil"
        subtitle="Consulta y actualiza tu información personal."
      />

      {/* Información actual (de solo lectura) */}
      <Card>
        <CardHead title="Información Actual" />
        <CardBody>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nombre</span>
              <span className={styles.infoValue}>{usuario?.nombre ?? '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Correo</span>
              <span className={styles.infoValue}>{usuario?.correo ?? '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Rol</span>
              <span className={styles.infoValue}>
                {ROL_LABEL[usuario?.rol_id ?? 0] ?? 'Desconocido'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Teléfono principal</span>
              <span className={styles.infoValue}>{telefonoOriginal || '—'}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Formulario de edición siempre visible */}
      <Card>
        <CardHead title="Editar Perfil" />
        <CardBody>
          <form onSubmit={handleSubmit} className={form.form}>

            <div className={form.field}>
              <label className={form.label} htmlFor="nombre">Nombre completo</label>
              <input
                id="nombre"
                name="nombre"
                className={form.input}
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Tu nombre completo"
                autoComplete="name"
              />
            </div>

            <div className={form.field}>
              <label className={form.label} htmlFor="correo">Correo electrónico</label>
              <input
                id="correo"
                name="correo"
                type="email"
                className={form.input}
                value={formData.correo}
                onChange={handleChange}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
              />
            </div>

            <div className={form.field}>
              <label className={form.label} htmlFor="perfil-telefono">Teléfono (opcional)</label>
              <input id="perfil-telefono" type="tel" className={form.input} value={telefono} maxLength={50} autoComplete="tel"
                disabled={saving || estadoTelefono !== 'listo'} onChange={e => setTelefono(e.target.value)} placeholder="+502 5555 1234" />
              <p className={form.fieldNote}>Ingresa 8 dígitos locales o un número internacional con código de país. Puedes dejarlo vacío para retirar el teléfono principal.</p>
              {estadoTelefono === 'error' && <p>No se pudo cargar el teléfono. <Btn type="button" kind="ghost" onClick={() => setRevisionTelefono(n => n + 1)}>Reintentar teléfono</Btn></p>}
            </div>

            <div className={form.editSection}>
              <p className={form.sectionTitle}>Cambiar Contraseña</p>
              <p className={form.fieldNote} style={{ marginBottom: 14 }}>
                Deja estos campos vacíos si no deseas cambiar tu contraseña.
              </p>

              <div className={form.fieldRow}>
                <div className={form.field}>
                  <label className={form.label} htmlFor="password">Nueva contraseña</label>
                  <PasswordInput
                    key={`password-${passwordRevision}`}
                    id="password"
                    name="password"
                    disabled={saving}
                    className={form.input}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>

                <div className={form.field}>
                  <label className={form.label} htmlFor="confirmar">Confirmar contraseña</label>
                  <PasswordInput
                    key={`confirmar-${passwordRevision}`}
                    id="confirmar"
                    name="confirmar"
                    disabled={saving}
                    className={form.input}
                    value={formData.confirmar}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <div className={form.buttonRow}>
              <Btn type="submit" kind="primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Btn>
            </div>

          </form>
        </CardBody>
      </Card>
    </div>
  );
}
