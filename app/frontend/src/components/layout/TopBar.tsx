import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './TopBar.module.css';
import logoImg from '../../assets/logo-parroquia.jpeg';

const ROL_LABEL: Record<number, string> = {
  1: 'Sacerdote',
  2: 'Coord. de Ministros',
  3: 'Coord. de Grupos',
  4: 'Ministro',
  5: 'Administrador',
};

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function TopBar() {
  const { logout } = useAuth();

  const raw = localStorage.getItem('usuario');
  const usuario = raw ? JSON.parse(raw) : null;
  const initials = usuario?.nombre ? getInitials(usuario.nombre) : '—';
  const rolLabel = usuario?.rol_id ? (ROL_LABEL[usuario.rol_id] ?? 'Usuario') : 'Usuario';

  return (
    <header className={styles.topbar}>
      <Link to="/dashboard" className={styles.brand}>
        <img src={logoImg} alt="Parroquia San Pedro Nolasco" className={styles.logoImg} />
        <span className={styles.brandName}>Parroquia San Pedro Nolasco</span>
      </Link>

      <div className={styles.spacer} />

      <div className={styles.actions}>
        {/* Búsqueda */}
        <button className={styles.iconBtn} title="Buscar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Notificaciones */}
        <div className={styles.bellWrap}>
          <button className={styles.iconBtn} title="Notificaciones">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <span className={styles.bellDot} />
        </div>

        <div className={styles.divider} />

        {/* Usuario */}
        <div className={styles.user}>
          <div className={styles.avatar}>{initials}</div>
          {usuario?.nombre && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{usuario.nombre}</span>
              <span className={styles.userRole}>{rolLabel}</span>
            </div>
          )}
        </div>

        {/* Cerrar sesión */}
        <button onClick={logout} className={styles.btnLogout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
