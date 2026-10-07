import { useEffect, useSyncExternalStore } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignIn, useAuth as useClerkAuth } from '@clerk/react';
import { useAuth } from '../../context/AuthContext';
import { CLERK_ENABLED, getLoginError, setLoginError, subscribeLoginError } from '../../auth/clerkSession';
import Spinner from '../../components/ui/Spinner';
import styles from './LoginPage.module.css';
import logoImg from '../../assets/logo-parroquia.jpeg';

// Formulario de Clerk. Mientras hay sesión de Clerk pero la app aún no validó al usuario
// (/api/auth/me), se muestra un estado de carga en lugar de dejar parpadear el formulario.
function ClerkSignInPanel() {
  const { isLoaded, isSignedIn } = useClerkAuth();

  if (isLoaded && isSignedIn) {
    return (
      <div className={styles.validando}>
        <Spinner size="md" label="Validando tu sesión…" />
      </div>
    );
  }

  return (
    <>
      {/* Sin registro público: las cuentas las crea el administrador. */}
      <SignIn
        routing="hash"
        forceRedirectUrl="/login"
        withSignUp={false}
        appearance={{ elements: { footerAction: { display: 'none' } } }}
      />
    </>
  );
}

export default function LoginPage() {
  const loginError = useSyncExternalStore(subscribeLoginError, getLoginError);

  const navigate  = useNavigate();
  const { usuario } = useAuth();

  // Con Clerk, ClerkSessionSync carga el usuario tras iniciar sesión; al tenerlo, se entra.
  useEffect(() => {
    if (CLERK_ENABLED && usuario) navigate('/dashboard', { replace: true });
  }, [usuario, navigate]);

  return (
    <div className={styles.page}>

      {/* ── Panel izquierdo ── */}
      <div className={styles.left}>
        <div className={styles.leftContent}>
          {/* Volver a la landing */}
          <Link to="/" className={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver al inicio
          </Link>

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

          {CLERK_ENABLED ? (
            <>
              {loginError && (
                <div className={styles.alerta} role="alert">
                  <span>{loginError}</span>
                  <button type="button" className={styles.alertaCerrar} onClick={() => setLoginError(null)} aria-label="Cerrar mensaje">
                    ×
                  </button>
                </div>
              )}
              <ClerkSignInPanel />
            </>
          ) : (
            <div className={styles.alerta} role="alert">
              <span>El inicio de sesión no está disponible por ahora. Contacta al administrador parroquial.</span>
            </div>
          )}

          <p className={styles.formHint}>
            ¿Necesitas una cuenta? Solicítala al administrador parroquial.
          </p>
        </div>
      </div>

    </div>
  );
}
