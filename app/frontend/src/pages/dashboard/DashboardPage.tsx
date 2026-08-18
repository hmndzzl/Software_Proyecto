import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { ROLES } from '../../components/ui/ProtectedRoute';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead } from '../../components/ui/Card';
import Btn from '../../components/ui/Btn';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './DashboardPage.module.css';

/* ── Role helpers ── */
const ROLE_HIERARCHY: Record<number, number[]> = {
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.SACERDOTE]: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_MINISTROS]: [ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_GRUPOS]: [ROLES.COORDINADOR_GRUPOS],
  [ROLES.MINISTRO]: [ROLES.MINISTRO],
};

const ROLE_LABELS: Record<number, string> = {
  [ROLES.SACERDOTE]: 'Sacerdote',
  [ROLES.COORDINADOR_MINISTROS]: 'Coordinador de Ministros',
  [ROLES.COORDINADOR_GRUPOS]: 'Coordinador de Grupos',
  [ROLES.MINISTRO]: 'Ministro',
  [ROLES.ADMIN]: 'Administrador',
};

function canAccess(userRolId: number, allowedRoles: number[]): boolean {
  const effective = ROLE_HIERARCHY[userRolId] ?? [userRolId];
  return allowedRoles.some(r => effective.includes(r));
}

/* ── Icons ── */
function IcoGrupos() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IcoMinistros() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IcoEspacios() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9,22 9,12 15,12 15,22" /></svg>;
}
function IcoReservas() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
}
function IcoTareas() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}
function IcoEventos() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}

/* ── Stat definitions ── */
interface StatDef {
  key: string;
  kicker: string;
  hint: string;
  variantClass: string;
  Icon: FC;
  apiPath: string;
  filter?: (data: any[]) => number;
  allowedRoles: number[];
  linkTo?: string;
  linkLabel?: string;
}

const ALL_STATS: StatDef[] = [
  {
    key: 'grupos', kicker: 'Grupos Parroquiales', hint: 'Total registrados',
    variantClass: 'statGrupos', Icon: IcoGrupos, apiPath: '/api/grupos',
    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS],
  },
  {
    key: 'ministros', kicker: 'Ministros Activos', hint: 'En servicio',
    variantClass: 'statMinistros', Icon: IcoMinistros, apiPath: '/api/personas',
    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS],
  },
  {
    key: 'espacios', kicker: 'Espacios', hint: 'Disponibles para reservar',
    variantClass: 'statEspacios', Icon: IcoEspacios, apiPath: '/api/espacios',
    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS],
  },
  {
    key: 'reservas', kicker: 'Reservas Pendientes', hint: 'Requieren atención',
    variantClass: 'statReservas', Icon: IcoReservas, apiPath: '/api/reservas',
    filter: (data: any[]) => data.filter((r: any) => r.estado_reserva_id === 1).length,
    allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS],
    linkTo: '/reservas', linkLabel: 'Revisar ahora',
  },
];

/* ── Acceso definitions ── */
interface AccesoDef {
  label: string;
  to: string;
  Icon: FC;
  allowedRoles: number[];
}

const ALL_ACCESOS: AccesoDef[] = [
  { label: 'Ministros', to: '/ministros', Icon: IcoMinistros, allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS] },
  { label: 'Tareas', to: '/tareas', Icon: IcoTareas, allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO] },
  { label: 'Reservas', to: '/reservas', Icon: IcoReservas, allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS] },
  { label: 'Grupos', to: '/grupos', Icon: IcoGrupos, allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS] },
  { label: 'Espacios', to: '/espacios', Icon: IcoEspacios, allowedRoles: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS] },
  { label: 'Eventos', to: '/eventos', Icon: IcoEventos, allowedRoles: [ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO] },
];

interface TareaProxima {
  id: number;
  fecha: string;
  hora_inicio: string;
  descripcion: string;
}

function buildKicker(): string {
  const now = new Date();
  const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  return `${dias[now.getDay()]} · ${now.getDate()} DE ${meses[now.getMonth()]}, ${now.getFullYear()}`;
}

export default function DashboardPage() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const rolId = Number(usuario?.rol_id);

  const visibleStats = ALL_STATS.filter(s => canAccess(rolId, s.allowedRoles));
  const visibleAccesos = ALL_ACCESOS.filter(a => canAccess(rolId, a.allowedRoles));
  const showTareas = canAccess(rolId, [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO]);

  const [statValues, setStatValues] = useState<Record<string, { value: number | string; loading: boolean }>>(
    () => Object.fromEntries(visibleStats.map(s => [s.key, { value: 0, loading: true }]))
  );
  const [tareasProximas, setTareasProximas] = useState<TareaProxima[]>([]);
  const [tareasLoading, setTareasLoading] = useState(true);

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
        .catch(() => { })
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

  const nombre = usuario?.nombre?.split(' ')[0] ?? 'Usuario';

  return (
    <div className={styles.dashboard}>

      <PageHeader
        kicker={buildKicker()}
        title={`Bienvenido, ${nombre}`}
        subtitle={`Panel de administración — ${ROLE_LABELS[rolId] ?? 'Usuario'} · Parroquia San Pedro Nolasco`}
      />

      {/* ── KPI Cards ── */}
      {visibleStats.length > 0 && (
        <div className={styles.statsGrid}>
          {visibleStats.map(stat => {
            const sv = statValues[stat.key] ?? { value: 0, loading: true };
            return (
              <div key={stat.key} className={`${styles.statCard} ${styles[stat.variantClass]}`}>
                <div className={styles.statBar} />
                <div className={styles.statBody}>
                  <div className={styles.statRow}>
                    <p className={styles.statKicker}>{stat.kicker}</p>
                    <div className={styles.statChip}>
                      <stat.Icon />
                    </div>
                  </div>
                  <p className={styles.statNumber}>{sv.loading ? '—' : sv.value}</p>
                  <p className={styles.statHint}>{stat.hint}</p>
                  {stat.linkTo && (
                    <Link to={stat.linkTo} className={styles.statLink}>
                      {stat.linkLabel} →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fila inferior ── */}
      <div className={styles.bottomGrid}>

        {/* Próximas Tareas */}
        {showTareas && (
          <Card>
            <CardHead
              title="Próximas Tareas"
              hint={tareasLoading ? '' : `${tareasProximas.length} próximas`}
              right={<Link to="/tareas" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-rojo)', fontWeight: 600, textDecoration: 'none' }}>Ver todas →</Link>}
            />
            <div className={styles.tareasList}>
              {tareasLoading && <LoadingState size="sm" label="Cargando..." />}
              {!tareasLoading && tareasProximas.length === 0 && (
                <EmptyState message="No hay tareas próximas." />
              )}
              {!tareasLoading && tareasProximas.map(t => (
                <div key={t.id} className={styles.tareaRow}>
                  <div className={styles.tareaIconChip}>
                    <IcoTareas />
                  </div>
                  <div className={styles.tareaInfo}>
                    <p className={styles.tareaDesc}>{t.descripcion}</p>
                    <span className={styles.tareaMeta}>
                      {formatFecha(t.fecha)} · {formatHora(t.hora_inicio)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/tareas" className={styles.tareaVerTodas}>
              Ver todas las tareas →
            </Link>
          </Card>
        )}

        {/* Accesos Rápidos */}
        {visibleAccesos.length > 0 && (
          <Card>
            <CardHead title="Accesos Rápidos" />
            <div className={styles.accesosGrid}>
              {visibleAccesos.map(a => (
                <Link key={a.to} to={a.to} className={styles.accesoTile}>
                  <div className={styles.accesoIconBadge}>
                    <a.Icon />
                  </div>
                  <span className={styles.accesoLabel}>{a.label}</span>
                </Link>
              ))}
            </div>
            {canAccess(rolId, [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS]) && (
              <div className={styles.accesoBtn}>
                <Link to="/espacios">
                  <Btn kind="gold" size="lg" style={{ width: '100%' }}>
                    Gestionar Espacios
                  </Btn>
                </Link>
              </div>
            )}
          </Card>
        )}

      </div>
    </div>
  );
}
