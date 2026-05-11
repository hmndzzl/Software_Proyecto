import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';
import logoImg from '../../assets/logo-parroquia.jpeg';

export default function LoginPage() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const navigate  = useNavigate();
  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      setAuth(data.token, data.usuario);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Credenciales inválidas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>

      {/* ── Panel izquierdo ── */}
      <div className={styles.left}>
        <div className={styles.leftContent}>
          {/* Marca */}
          <div className={styles.logoWrap}>
            <img src={logoImg} alt="Parroquia San Pedro Nolasco" className={styles.logoImg} />
            <span className={styles.logoName}>Parroquia San Pedro Nolasco</span>
          </div>

          {/* Titular */}
          <p className={styles.leftKicker}>Bienvenido de nuevo</p>
          <h1 className={styles.leftTitle}>
            La casa del&nbsp;Señor, ahora también digital.
          </h1>
          <div className={styles.leftRule} />
          <p className={styles.leftCopy}>
            Plataforma administrativa para la gestión de ministros, tareas parroquiales, reservas de espacios y eventos litúrgicos de la comunidad.
          </p>
        </div>

        <p className={styles.leftFooter}>
          © 2026 Parroquia San Pedro Nolasco · Guatemala
        </p>
      </div>

      {/* ── Panel derecho ── */}
      <div className={styles.right}>
        <div className={styles.formCard}>
          <p className={styles.formKicker}>Acceso administrativo</p>
          <h2 className={styles.formTitle}>Hola, de nuevo</h2>
          <p className={styles.formSubtitle}>Ingresa tus credenciales para continuar.</p>

          <form onSubmit={handleSubmit}>
            <div className={styles.fields}>

              {/* Email */}
              <div>
                <label className={styles.fieldLabel}>Correo electrónico</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="M2 7l10 7 10-7"/>
                    </svg>
                  </span>
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="usuario@parroquia.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className={styles.fieldLabel}>Contraseña</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="10" rx="2"/>
                      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                    </svg>
                  </span>
                  <input
                    className={styles.input}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Olvidé contraseña */}
            <div className={styles.forgotRow}>
              <button type="button" className={styles.forgotLink}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.loginBtn} disabled={loading}>
              {loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className={styles.formHint}>
            ¿Necesitas una cuenta? Solicítala al administrador parroquial.
          </p>
        </div>
      </div>

    </div>
  );
}
