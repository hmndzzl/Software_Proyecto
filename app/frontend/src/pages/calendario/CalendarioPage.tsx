import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import styles from './CalendarioPage.module.css';

interface AsignadoInfo {
  persona_id: number;
  nombre: string;
  correo: string;
  rol: string;
}

interface Tarea {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  descripcion: string;
  persona_nombre?: string | null;
  asignados: AsignadoInfo[];
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper to get the Monday of a given date's week
const getMonday = (d: Date): Date => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  // in JS: Sunday=0, Monday=1, ..., Saturday=6
  // difference to Monday (1)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
};

// Helper to format date as YYYY-MM-DD
const formatYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper to format the range header text
const formatRangeText = (mon: Date, sun: Date): string => {
  const monDay = mon.getDate();
  const monMonth = MESES[mon.getMonth()];
  const sunDay = sun.getDate();
  const sunMonth = MESES[sun.getMonth()];
  const sunYear = sun.getFullYear();

  if (mon.getMonth() === sun.getMonth()) {
    return `${monDay} al ${sunDay} de ${monMonth}, ${sunYear}`;
  } else {
    return `${monDay} de ${monMonth} al ${sunDay} de ${sunMonth}, ${sunYear}`;
  }
};

const formatHora = (h?: string | null): string => (h ? h.substring(0, 5) : '--:--');

// La API puede devolver 'YYYY-MM-DD' o un ISO completo ('YYYY-MM-DDTHH:mm:ss.sssZ').
// Nos quedamos siempre con la parte de fecha, sin volver a parsear a Date
// (parsear reintroduciria el desfase de zona horaria).
const fechaKey = (fecha?: string | null): string => (fecha ? fecha.slice(0, 10) : '');

// Ordena por hora de inicio y, en empate, por hora de fin, para que el orden
// dentro de la columna no dependa del ORDER BY de la API.
const compararPorHora = (a: Tarea, b: Tarea): number =>
  (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '') ||
  (a.hora_fin ?? '').localeCompare(b.hora_fin ?? '');

// Agrupa las tareas por dia en una sola pasada, descartando repetidos por id.
const agruparPorDia = (tareas: Tarea[]): Map<string, Tarea[]> => {
  const porDia = new Map<string, Tarea[]>();
  const vistas = new Set<number>();

  for (const tarea of tareas) {
    const dia = fechaKey(tarea.fecha);
    if (!dia || vistas.has(tarea.id)) continue;
    vistas.add(tarea.id);

    const delDia = porDia.get(dia);
    if (delDia) {
      delDia.push(tarea);
    } else {
      porDia.set(dia, [tarea]);
    }
  }

  porDia.forEach(delDia => delDia.sort(compararPorHora));
  return porDia;
};

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [tareas, setTareas]           = useState<Tarea[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const activeMonday = getMonday(currentDate);

  const activeSunday = new Date(activeMonday);
  activeSunday.setDate(activeMonday.getDate() + 6);

  // Generate the 7 days of the active week (Monday to Sunday)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(activeMonday);
    day.setDate(activeMonday.getDate() + i);
    return day;
  });

  // silent=true evita el parpadeo de "Cargando..." cuando el refresco ocurre
  const cargarTareas = (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }

    const startStr = formatYYYYMMDD(activeMonday);
    const endStr   = formatYYYYMMDD(activeSunday);

    apiClient.get(`/api/tareas?fecha_inicio=${startStr}&fecha_fin=${endStr}`)
      .then(res => {
        setTareas(res.data);
        if (silent) setError('');
      })
      .catch(() => {
        if (!silent) setError('Error al cargar las tareas del calendario.');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    cargarTareas();

    // Las tareas pueden crearse/modificarse desde otra pestaña sin que este componente se vuelva a montar, al recuperar el foco o visibilidad, se refresca para no depender de un
    // recargo manual de la página.
    const handleRefresh = () => {
      if (document.visibilityState === 'visible') {
        cargarTareas(true);
      }
    };
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [currentDate]);

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const todayStr = formatYYYYMMDD(new Date());

  const tareasPorDia = agruparPorDia(tareas);

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Agenda Parroquial"
        title="Calendario de Tareas"
        subtitle="Visualiza la asignación semanal de tareas y compromisos de los ministros."
      />

      {/* Navigation Controls */}
      <div className={styles.controlsRow}>
        <div className={styles.titleArea}>
          <span className={styles.kicker}>Semana Activa</span>
          <span className={styles.rangeText}>{formatRangeText(activeMonday, activeSunday)}</span>
        </div>
        <div className={styles.btnGroup}>
          <button type="button" className={styles.navBtn} onClick={handlePrevWeek}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Anterior
          </button>
          <button type="button" className={`${styles.navBtn} ${styles.todayBtn}`} onClick={handleToday}>
            Hoy
          </button>
          <button type="button" className={styles.navBtn} onClick={handleNextWeek}>
            Siguiente
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {loading && <LoadingState label="Cargando calendario..." />}
      {error && <ErrorState message={error} onRetry={() => cargarTareas()} />}

      {!loading && !error && (
        <div className={styles.grid}>
          {weekDays.map((day, idx) => {
            const dayStr = formatYYYYMMDD(day);
            const isToday = dayStr === todayStr;

            const dayTareas = tareasPorDia.get(dayStr) ?? [];

            return (
              <div
                key={dayStr}
                className={`${styles.dayColumn}${isToday ? ` ${styles.todayColumn}` : ''}`}
              >
                <div className={styles.dayHeader}>
                  <span className={styles.weekdayName}>{DIAS_SEMANA[idx]}</span>
                  <span className={styles.dayNum}>{day.getDate()}</span>
                </div>

                <div className={styles.tasksList}>
                  {dayTareas.length === 0 ? (
                    <div className={styles.emptyState}>Sin tareas</div>
                  ) : (
                    dayTareas.map(t => {
                      // Fallback name matching our join result or first assignee
                      const ministerName = t.persona_nombre || t.asignados?.[0]?.nombre;

                      return (
                        <div key={t.id} className={styles.taskCard}>
                          <div className={styles.timeRow}>
                            <svg className={styles.clockIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span>{formatHora(t.hora_inicio)} – {formatHora(t.hora_fin)}</span>
                          </div>

                          <p className={styles.taskDesc}>{t.descripcion}</p>

                          <div className={styles.assigneeRow}>
                            {ministerName ? (
                              <>
                                <svg className={styles.assignIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                </svg>
                                <span className={styles.assignName}>{ministerName}</span>
                              </>
                            ) : (
                              <span className={styles.unassignedBadge}>Sin asignar</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
