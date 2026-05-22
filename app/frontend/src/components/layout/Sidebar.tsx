import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { ROLES, usuarioTieneRol } from '../../utils/roles';

const NAV_ITEMS: { to: string; label: string; roles: number[] | null; icon: React.ReactNode }[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    roles: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: '/ministros',
    label: 'Ministros',
    roles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.ADMIN],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    to: '/tareas',
    label: 'Tareas',
    roles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO, ROLES.ADMIN],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    to: '/reservas',
    label: 'Reservas',
    roles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    to: '/grupos',
    label: 'Grupos',
    roles: [ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v4a1 1 0 0 0 1 1h3"/><path d="M7 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-2"/>
        <path d="M17 12h3"/><path d="M20 9v6"/>
      </svg>
    ),
  },
  {
    to: '/espacios',
    label: 'Espacios',
    roles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    to: '/eventos',
    label: 'Eventos',
    roles: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    to: '/mis-reservas',
    label: 'Mis Reservas',
    roles: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5"/><path d="M3 21v-1a9 9 0 0 1 18 0v1"/>
        <path d="M9 11l2 2 4-4" stroke="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/notificaciones',
    label: 'Notificaciones',
    roles: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
];

const ROLES_RESERVAS = [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN];

export default function Sidebar() {
  const navigate = useNavigate();

  const navItems = NAV_ITEMS.filter(({ roles }) => roles === null || usuarioTieneRol(roles));
  const puedeVerReservas = usuarioTieneRol(ROLES_RESERVAS);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <p className={styles.kicker}>Administración</p>
        <p className={styles.subtitle}>San Pedro Nolasco</p>
      </div>

      <nav className={styles.nav}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navLink}${isActive ? ` ${styles.active}` : ''}`
            }
          >
            <span className={styles.navIcon}>{icon}</span>
            <span className={styles.navLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {puedeVerReservas && (
        <button type="button" className={styles.btnNuevo} onClick={() => navigate('/reservas')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Registro
        </button>
      )}

      <footer className={styles.footer}>
        <a href="#" className={styles.footerLink}>Configuración</a>
        <a href="#" className={styles.footerLink}>Ayuda y Soporte</a>
      </footer>
    </aside>
  );
}
