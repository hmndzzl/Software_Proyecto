import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { fechaNotificacion } from '../../modules/notificaciones/utils/fechaNotificacion';
import type { Notificacion } from '../../types';
import styles from './TopBar.module.css';
import logoImg from '../../assets/logo-parroquia.jpeg';
import { leerIntervaloNotificaciones, UI_PREFERENCES_EVENT } from '../../auth/sessionStore';

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

interface TopBarProps {
  onAbrirMenu?: () => void;
}

export default function TopBar({ onAbrirMenu }: TopBarProps) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const initials = usuario?.nombre ? getInitials(usuario.nombre) : '—';
  const rolLabel = usuario?.rol_id ? (ROL_LABEL[usuario.rol_id] ?? 'Usuario') : 'Usuario';

  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);
  const [intervaloNotificaciones, setIntervaloNotificaciones] = useState(leerIntervaloNotificaciones);
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
    const id = setInterval(fetchNotifs, intervaloNotificaciones * 1000);
    return () => clearInterval(id);
  }, [intervaloNotificaciones]);

  useEffect(() => {
    const sincronizarPreferencias = () => setIntervaloNotificaciones(leerIntervaloNotificaciones());
    window.addEventListener(UI_PREFERENCES_EVENT, sincronizarPreferencias);
    return () => window.removeEventListener(UI_PREFERENCES_EVENT, sincronizarPreferencias);
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
    navigate(`/notificaciones?resaltar=${notif.id}`);
  };

  return (
    <header className={styles.topbar}>
      {onAbrirMenu && (
        <button type="button" className={styles.menuBtn} onClick={onAbrirMenu} aria-label="Abrir menú">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      )}
      <Link to="/dashboard" className={styles.brand}>
        <img src={logoImg} alt="Parroquia San Pedro Nolasco" className={styles.logoImg} />
        <span className={styles.brandName}>Parroquia San Pedro Nolasco</span>
      </Link>

      <div className={styles.spacer} />

      <div className={styles.actions}>
        <Link to="/" className={styles.publicLink}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a18 18 0 0 0 0 18 18 18 0 0 0 0-18" />
          </svg>
          <span>Sitio público</span>
        </Link>

        {/* Notificaciones */}
        <div className={styles.bellWrap} ref={wrapRef}>
          <button
            type="button"
            className={styles.iconBtn}
            title="Notificaciones"
            aria-label="Notificaciones"
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
                    <span className={styles.dropdownFecha}>{fechaNotificacion(n.fecha, n.enviado_en)}</span>
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

        {/* Usuario — clic navega a /perfil */}
        <Link to="/perfil" className={styles.userLink}>
          <div className={styles.avatar}>{initials}</div>
          {usuario?.nombre && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{usuario.nombre}</span>
              <span className={styles.userRole}>{rolLabel}</span>
            </div>
          )}
        </Link>

        {/* Cerrar sesión */}
        <button type="button" onClick={logout} className={styles.btnLogout} aria-label="Cerrar Sesión">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className={styles.logoutLabel}>Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
}
