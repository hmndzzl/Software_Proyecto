import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import Btn from '../../components/ui/Btn';
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

export default function PerfilPage() {
  const { usuario, setAuth } = useAuth();

  // Formulario precargado 
  const [formData, setFormData] = useState<FormState>({
    nombre:    usuario?.nombre  ?? '',
    correo:    usuario?.correo  ?? '',
    password:  '',
    confirmar: '',
  });

  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');

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
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (formData.password && formData.password !== formData.confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const body: Record<string, string> = {};
    if (formData.nombre.trim())  body.nombre   = formData.nombre.trim();
    if (formData.correo.trim())  body.correo   = formData.correo.trim();
    if (formData.password)       body.password = formData.password;

    if (Object.keys(body).length === 0) {
      setError('No hay cambios para guardar.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.put(`/api/personas/${usuario!.id}`, body);
      const actualizado = res.data.persona;

      // Actualizar contexto y localStorage para reflejar los cambios en toda la app
      const token = localStorage.getItem('token') ?? '';
      setAuth(token, {
        id:     actualizado.id,
        nombre: actualizado.nombre,
        correo: actualizado.correo,
        rol_id: actualizado.rol_id,
      });

      setFormData(prev => ({ ...prev, password: '', confirmar: '' }));
      setSuccess('Perfil actualizado correctamente.');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('El correo ya está en uso por otra cuenta.');
      } else {
        const msg = err?.response?.data?.mensaje;
        setError(msg ?? 'Error al actualizar el perfil. Inténtalo de nuevo.');
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
                placeholder="tu@correo.cl"
                autoComplete="email"
              />
            </div>

            <div className={form.editSection}>
              <p className={form.sectionTitle}>Cambiar Contraseña</p>
              <p className={form.fieldNote} style={{ marginBottom: 14 }}>
                Deja estos campos vacíos si no deseas cambiar tu contraseña.
              </p>

              <div className={form.fieldRow}>
                <div className={form.field}>
                  <label className={form.label} htmlFor="password">Nueva contraseña</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className={form.input}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>

                <div className={form.field}>
                  <label className={form.label} htmlFor="confirmar">Confirmar contraseña</label>
                  <input
                    id="confirmar"
                    name="confirmar"
                    type="password"
                    className={form.input}
                    value={formData.confirmar}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {success && <p className={`${form.message} ${form.messageSuccess}`}>{success}</p>}
            {error   && <p className={`${form.message} ${form.messageError}`}>{error}</p>}

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
