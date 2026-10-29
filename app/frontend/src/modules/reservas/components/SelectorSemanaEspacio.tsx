import { useState } from 'react';
import styles from './SelectorSemanaEspacio.module.css';
import { ESTADOS_RESERVA } from '../../../utils/estadosReserva';
import { DIAS_SEMANA, getMonday, formatYYYYMMDD, formatRangeText } from '../../../utils/date';
import type { Reserva } from '../../../types';

interface Props {
  reservas: Reserva[];
  fechaSeleccionada: string;
  onSeleccionarDia: (fecha: string) => void;
}

// Cuenta como "con movimiento" cualquier reserva Pendiente o Confirmada: ambas son algo que
// el usuario querría ver antes de elegir ese día, aunque solo la Confirmada bloquee de verdad
// un horario (ver DisponibilidadEspacioDia, que sí distingue por hora una vez elegido el día).
function contarPorDia(reservas: Reserva[]): Map<string, number> {
  const porDia = new Map<string, number>();
  for (const r of reservas) {
    if (r.estado_reserva_id !== ESTADOS_RESERVA.PENDIENTE && r.estado_reserva_id !== ESTADOS_RESERVA.CONFIRMADA) continue;
    porDia.set(r.fecha, (porDia.get(r.fecha) ?? 0) + 1);
  }
  return porDia;
}

export default function SelectorSemanaEspacio({ reservas, fechaSeleccionada, onSeleccionarDia }: Props) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const monday = getMonday(currentDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });

  const porDia = contarPorDia(reservas);
  const todayStr = formatYYYYMMDD(new Date());

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.titulo}>Explorar semana <span className={styles.rango}>({formatRangeText(monday, sunday)})</span></p>
        <div className={styles.nav}>
          <button type="button" className={styles.navBtn} onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })} aria-label="Semana anterior">‹</button>
          <button type="button" className={styles.navBtn} onClick={() => setCurrentDate(new Date())}>Hoy</button>
          <button type="button" className={styles.navBtn} onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })} aria-label="Semana siguiente">›</button>
        </div>
      </div>

      <div className={styles.dias}>
        {weekDays.map((day, idx) => {
          const dayStr = formatYYYYMMDD(day);
          const cantidad = porDia.get(dayStr) ?? 0;
          const esHoy = dayStr === todayStr;
          const esSeleccionado = dayStr === fechaSeleccionada;
          return (
            <button
              key={dayStr}
              type="button"
              className={`${styles.dia}${esHoy ? ` ${styles.diaHoy}` : ''}${esSeleccionado ? ` ${styles.diaSeleccionado}` : ''}`}
              onClick={() => onSeleccionarDia(dayStr)}
            >
              <span className={styles.diaNombre}>{DIAS_SEMANA[idx]}</span>
              <span className={styles.diaNumero}>{day.getDate()}</span>
              {cantidad > 0 ? (
                <span className={styles.diaPastilla}>{cantidad}</span>
              ) : (
                <span className={styles.diaLibre}>Libre</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
