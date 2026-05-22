import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { formatFecha } from '../../utils/date';
import styles from './TopBar.module.css';
import logoImg from '../../assets/logo-parroquia.jpeg';

const ROL_LABEL: Record<number, string> = {
  1: 'Sacerdote',
  2: 'Coord. de Ministros',
  3: 'Coord. de Grupos',
  4: 'Ministro',
  5: 'Administrador',
};

interface Notificacion {
  id: number;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

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
  const navigate = useNavigate();

  const raw = localStorage.getItem('usuario');
  const usuario = raw ? JSON.parse(raw) : null;
  const initials = usuario?.nombre ? getInitials(usuario.nombre) : '—';
  const rolLabel = usuario?.rol_id ? (ROL_LABEL[usuario.rol_id] ?? 'Usuario') : 'Usuario';

  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const { data } = await apiClient.get<Notificacion[]>('/api/notificaciones');
      setNotifs(data);
    } catch {
      // silencioso — no interrumpir la UI si falla el polling
    }
  };

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifs.filter((n) => !n.leida).length;
  const preview = notifs.slice(0, 5);

  const handleNotifClick = async (notif: Notificacion) => {
    if (!notif.leida) {
      try {
        await apiClient.put(`/api/notificaciones/${notif.id}/leida`);
        setNotifs((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
        );
      } catch {
        // continuar navegación aunque falle el PUT
      }
    }
    setOpen(false);
    navigate('/notificaciones');
  };

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
        <div className={styles.bellWrap} ref={wrapRef}>
          <button
            className={styles.iconBtn}
            title="Notificaciones"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          {unread > 0 && (
            <span className={styles.bellBadge}>{unread > 9 ? '9+' : unread}</span>
          )}

          {open && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHead}>Notificaciones</div>
              {preview.length === 0 ? (
                <p className={styles.dropdownEmpty}>Sin notificaciones</p>
              ) : (
                preview.map((n) => (
                  <button
                    key={n.id}
                    className={`${styles.dropdownItem} ${!n.leida ? styles.dropdownItemUnread : ''}`}
                    onClick={() => handleNotifClick(n)}
                  >
                    <span className={styles.dropdownMsg}>{n.mensaje}</span>
                    <span className={styles.dropdownFecha}>{formatFecha(n.fecha)}</span>
                  </button>
                ))
              )}
              <Link to="/notificaciones" className={styles.dropdownFooter} onClick={() => setOpen(false)}>
                Ver todas
              </Link>
            </div>
          )}
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
