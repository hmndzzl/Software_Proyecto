import { useState } from 'react';
import { Card, CardHead, CardBody } from '../../../components/ui/Card';
import { ESTADOS_RESERVA } from '../../../utils/estadosReserva';
import { DIAS_SEMANA, getMonday, formatYYYYMMDD, formatRangeText, fechaKey, formatHora } from '../../../utils/date';
import styles from './EspacioCalendarioReservas.module.css';

export interface ReservaCalendario {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado_reserva_id: number;
  evento_titulo: string | null;
  evento_descripcion: string | null;
}

interface EspacioCalendarioReservasProps {
  reservas: ReservaCalendario[];
}

const compararPorHora = (a: ReservaCalendario, b: ReservaCalendario): number =>
  a.hora_inicio.localeCompare(b.hora_inicio) || a.hora_fin.localeCompare(b.hora_fin);

// Solo reservas confirmadas: lo que de verdad ocupa el salón (mismo criterio que la
// disponibilidad dinámica de /api/espacios, estado_reserva_id = 2).
function agruparConfirmadasPorDia(reservas: ReservaCalendario[]): Map<string, ReservaCalendario[]> {
  const porDia = new Map<string, ReservaCalendario[]>();

  for (const r of reservas) {
    if (r.estado_reserva_id !== ESTADOS_RESERVA.CONFIRMADA) continue;
    const dia = fechaKey(r.fecha);
    if (!dia) continue;

    const delDia = porDia.get(dia);
    if (delDia) delDia.push(r);
    else porDia.set(dia, [r]);
  }

  porDia.forEach(delDia => delDia.sort(compararPorHora));
  return porDia;
}

export default function EspacioCalendarioReservas({ reservas }: EspacioCalendarioReservasProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const activeMonday = getMonday(currentDate);
  const activeSunday = new Date(activeMonday);
  activeSunday.setDate(activeMonday.getDate() + 6);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(activeMonday);
    day.setDate(activeMonday.getDate() + i);
    return day;
  });

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + 7);
    setCurrentDate(d);
  };

  const handleToday = () => setCurrentDate(new Date());

  const todayStr = formatYYYYMMDD(new Date());
  const porDia = agruparConfirmadasPorDia(reservas);

  return (
    <Card>
      <CardHead
        title="Calendario del Espacio"
        hint={formatRangeText(activeMonday, activeSunday)}
        right={
          <div className={styles.navGroup}>
            <button type="button" className={styles.navBtn} onClick={handlePrevWeek} aria-label="Semana anterior">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button type="button" className={`${styles.navBtn} ${styles.todayBtn}`} onClick={handleToday}>
              Hoy
            </button>
            <button type="button" className={styles.navBtn} onClick={handleNextWeek} aria-label="Semana siguiente">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        }
      />

      <CardBody>
        <div className={styles.grid}>
          {weekDays.map((day, idx) => {
            const dayStr = formatYYYYMMDD(day);
            const isToday = dayStr === todayStr;
            const reservasDelDia = porDia.get(dayStr) ?? [];

            return (
              <div key={dayStr} className={`${styles.dayColumn}${isToday ? ` ${styles.todayColumn}` : ''}`}>
                <div className={styles.dayHeader}>
                  <span className={styles.weekdayName}>{DIAS_SEMANA[idx]}</span>
                  <span className={styles.dayNum}>{day.getDate()}</span>
                </div>

                <div className={styles.dayBody}>
                  {reservasDelDia.length === 0 ? (
                    <div className={styles.libre}>Libre</div>
                  ) : (
                    reservasDelDia.map(r => (
                      <div key={r.id} className={styles.reservaCard}>
                        <div className={styles.timeRow}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          <span>{formatHora(r.hora_inicio)}–{formatHora(r.hora_fin)}</span>
                        </div>
                        <p className={styles.reservaTitulo}>{r.evento_titulo || `Reserva #${r.id}`}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
