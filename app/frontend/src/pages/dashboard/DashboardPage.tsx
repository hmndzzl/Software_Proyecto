import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { ROLES } from '../../components/ui/ProtectedRoute';
import styles from './DashboardPage.module.css';

/* ──────────────────────────────────────────
   Role helpers (mirrors ProtectedRoute.tsx)
   ────────────────────────────────────────── */
const ROLE_HIERARCHY: Record<number, number[]> = {
  [ROLES.ADMIN]:                [ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.SACERDOTE]:            [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_MINISTROS]:[ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_GRUPOS]:   [ROLES.COORDINADOR_GRUPOS],
  [ROLES.MINISTRO]:             [ROLES.MINISTRO],
};

const ROLE_LABELS: Record<number, string> = {
  [ROLES.SACERDOTE]:            'Sacerdote',
  [ROLES.COORDINADOR_MINISTROS]:'Coordinador de Ministros',
  [ROLES.COORDINADOR_GRUPOS]:   'Coordinador de Grupos',
  [ROLES.MINISTRO]:             'Ministro',
  [ROLES.ADMIN]:                'Administrador',
};

function canAccess(userRolId: number, allowedRoles: number[]): boolean {
  const effective = ROLE_HIERARCHY[userRolId] ?? [userRolId];
  return allowedRoles.some(r => effective.includes(r));
}

/* ──────────────────────────────────────────
   SVG Icons (Feather icon style)
   ────────────────────────────────────────── */
function IconGrupos() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconMinistros() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconEspacios() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  );
}

function IconReservas() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function IconTareas() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,11 12,14 22,4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  );
}

/* ──────────────────────────────────────────
   Data definitions
   ────────────────────────────────────────── */
interface StatDef {
  key: string;
  label: string;
  cardClass: string;
  Icon: FC;
  apiPath: string;
  filter?: (data: any[]) => number;
  allowedRoles: number[];
}

const ALL_STATS: StatDef[] = [
  {
    key: 'grupos',
    label: 'Grupos Parroquiales',
    cardClass: 'statCardGrupos',
    Icon: IconGrupos,
    apiPath: '/api/grupos',
    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS],
  },
  {
    key: 'ministros',
    label: 'Ministros',
    cardClass: 'statCardMinistros',
    Icon: IconMinistros,
    apiPath: '/api/personas',
    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS],
  },
  {
    key: 'espacios',
    label: 'Espacios',
    cardClass: 'statCardEspacios',
    Icon: IconEspacios,
    apiPath: '/api/espacios',
    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS],
  },
  {
    key: 'reservas',
    label: 'Reservas Pendientes',
    cardClass: 'statCardReservas',
    Icon: IconReservas,
    apiPath: '/api/reservas',
    filter: (data: any[]) => data.filter((r: any) => r.estado_reserva_id === 1).length,
    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS],
  },
];

interface AccesoDef {
  label: string;
  to: string;
  cardClass: string;
  Icon: FC;
  allowedRoles: number[];
}

const ALL_ACCESOS: AccesoDef[] = [
  { label: 'Ministros', to: '/ministros', cardClass: 'accesoCardMinistros', Icon: IconMinistros, allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS] },
  { label: 'Tareas',    to: '/tareas',    cardClass: 'accesoCardTareas',    Icon: IconTareas,    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO] },
  { label: 'Reservas',  to: '/reservas',  cardClass: 'accesoCardReservas',  Icon: IconReservas,  allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS] },
  { label: 'Grupos',    to: '/grupos',    cardClass: 'accesoCardGrupos',    Icon: IconGrupos,    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS] },
  { label: 'Espacios',  to: '/espacios',  cardClass: 'accesoCardEspacios',  Icon: IconEspacios,  allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS] },
];

/* ──────────────────────────────────────────
   Component
   ────────────────────────────────────────── */
interface TareaProxima {
  id: number;
  fecha: string;
  hora_inicio: string;
  descripcion: string;
}

export default function DashboardPage() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const rolId   = Number(usuario?.rol_id);

  const visibleStats   = ALL_STATS.filter(s => canAccess(rolId, s.allowedRoles));
  const visibleAccesos = ALL_ACCESOS.filter(a => canAccess(rolId, a.allowedRoles));
  const showTareas     = canAccess(rolId, [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO]);

  const [statValues, setStatValues] = useState<Record<string, { value: number | string; loading: boolean }>>(
    () => Object.fromEntries(visibleStats.map(s => [s.key, { value: 0, loading: true }]))
  );
  const [tareasProximas, setTareasProximas] = useState<TareaProxima[]>([]);
  const [tareasLoading, setTareasLoading]   = useState(true);

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];

    visibleStats.forEach(stat => {
      apiClient.get(stat.apiPath)
        .then(r => r.data)
        .then((data: any[]) => {
          const value = stat.filter ? stat.filter(data) : data.length;
          setStatValues(prev => ({ ...prev, [stat.key]: { value, loading: false } }));
        })
        .catch(() =>
          setStatValues(prev => ({ ...prev, [stat.key]: { value: '—', loading: false } }))
        );
    });

    if (showTareas) {
      apiClient.get('/api/tareas')
        .then(r => r.data)
        .then((data: TareaProxima[]) => {
          const proximas = data
            .filter(t => t.fecha >= hoy)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .slice(0, 5);
          setTareasProximas(proximas);
        })
        .catch(() => {})
        .finally(() => setTareasLoading(false));
    } else {
      setTareasLoading(false);
    }
  }, []);

  const formatFecha = (fecha: string) => {
    const [y, m, d] = fecha.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  };

  const formatHora = (hora: string) => hora.substring(0, 5);

  return (
    <div className="page-container">
      <div className={`content-container ${styles.dashboard}`}>

        {/* Bienvenida */}
        <div className={styles.header}>
          <h2 className={styles.welcomeTitle}>
            Bienvenido, {usuario?.nombre ?? 'Usuario'}
          </h2>
          <p className={styles.welcomeSub}>
            {ROLE_LABELS[rolId] ?? 'Usuario'} — Parroquia San Pedro Nolasco
          </p>
        </div>

        {/* Tarjetas de resumen (visibilidad por rol) */}
        {visibleStats.length > 0 && (
          <div className={styles.statsGrid}>
            {visibleStats.map(stat => {
              const sv = statValues[stat.key] ?? { value: 0, loading: true };
              return (
                <div
                  key={stat.key}
                  className={`${styles.statCard} ${styles[stat.cardClass]}`}
                >
                  <div className={styles.statIconWrap}>
                    <stat.Icon />
                  </div>
                  <p className={styles.statValue}>
                    {sv.loading ? '...' : sv.value}
                  </p>
                  <p className={styles.statLabel}>{stat.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Fila inferior */}
        <div className={styles.bottomGrid}>

          {/* Próximas Tareas (sólo roles con acceso a /tareas) */}
          {showTareas && (
            <div className={`card ${styles.cardBody}`}>
              <h3 className={styles.cardTitle}>Próximas Tareas</h3>
              {tareasLoading && (
                <p className={styles.emptyText}>Cargando...</p>
              )}
              {!tareasLoading && tareasProximas.length === 0 && (
                <p className={styles.emptyText}>No hay tareas próximas.</p>
              )}
              {!tareasLoading && tareasProximas.map(t => (
                <div key={t.id} className={styles.tareaRow}>
                  <span className={styles.tareaDesc}>{t.descripcion}</span>
                  <span className={styles.tareaBadge}>
                    {formatFecha(t.fecha)} · {formatHora(t.hora_inicio)}
                  </span>
                </div>
              ))}
              <Link to="/tareas" className={styles.verTodas}>
                Ver todas las tareas →
              </Link>
            </div>
          )}

          {/* Accesos Rápidos (filtrados por rol) */}
          {visibleAccesos.length > 0 && (
            <div className={`card ${styles.cardBody}`}>
              <h3 className={styles.cardTitle}>Accesos Rápidos</h3>
              <div className={styles.accesosGrid}>
                {visibleAccesos.map(a => (
                  <Link
                    key={a.to}
                    to={a.to}
                    className={`${styles.accesoCard} ${styles[a.cardClass]}`}
                  >
                    <span className={styles.accesoIcon}>
                      <a.Icon />
                    </span>
                    <span>{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
