import { useState } from 'react';
import { DIAS_SEMANA } from '../../utils/date';
import { obtenerEstadoReserva } from '../../utils/estadosReserva';
import CompromisosDia from './CompromisosDia';
import { claveDia, fechaCompleta, type Compromiso } from './calendario.utils';
import styles from './CalendarioPage.module.css';

/** Segunda línea de cada vista previa: lo más útil para decidir si hace falta
 * entrar al detalle — a quién le toca servir (tarea) o si ya está confirmado
 * o sigue pendiente de aprobación (evento) — sin repetir el título ni la hora. */
function subtituloCompromiso(item: Compromiso): { texto: string; color?: string } {
  if (item.tipo === 'tarea') {
    const [primero, ...resto] = item.dato.asignados;
    if (!primero) return { texto: 'Sin asignar' };
    return { texto: resto.length ? `${primero.nombre} +${resto.length}` : primero.nombre };
  }
  const estado = obtenerEstadoReserva(item.dato.estado_reserva_id);
  return { texto: estado.label, color: `var(--estado-reserva-${estado.kind}-fg)` };
}

interface Props {
  fecha: Date;
  dias: Date[];
  porDia: Map<string, Compromiso[]>;
  onSeleccionar: (item: Compromiso) => void;
}

export default function CalendarioMes({ fecha, dias, porDia, onSeleccionar }: Props) {
  const [diaSeleccionado, setDiaSeleccionado] = useState(claveDia(fecha));
  const hoy = claveDia(new Date());
  const mes = fecha.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
  const delMes = dias.filter(d => d.getMonth() === fecha.getMonth());
  const conCompromisos = delMes.filter(d => (porDia.get(claveDia(d))?.length ?? 0) > 0);
  return <>
    <table className={styles.monthTable}>
      <caption>Calendario de {mes}. Selecciona un día para ver todos sus compromisos.</caption>
      <thead><tr>{DIAS_SEMANA.map(d => <th key={d} scope="col">{d}</th>)}</tr></thead>
      <tbody>{Array.from({ length: dias.length / 7 }, (_, semana) => <tr key={semana}>
        {dias.slice(semana * 7, semana * 7 + 7).map(dia => {
          const clave = claveDia(dia);
          const items = porDia.get(clave) ?? [];
          const esHoy = clave === hoy;
          return <td key={clave}>
            {dia.getMonth() !== fecha.getMonth() ? <span className={styles.outsideMonth}>{dia.getDate()}</span>
              : <button type="button" className={`${styles.monthDay}${esHoy ? ` ${styles.monthDayToday}` : ''}`} aria-pressed={clave === diaSeleccionado}
                aria-label={`${fechaCompleta(clave)}${esHoy ? ', hoy' : ''}, ${items.length} compromisos`}
                onClick={() => setDiaSeleccionado(clave)}>
                <span className={styles.monthDayNum}>
                  {dia.getDate()}
                  {esHoy && <span className={styles.todayLabel}>Hoy</span>}
                </span>
                {items.length > 0 && <div className={styles.monthPreviewList}>
                  {items.slice(0, 2).map(item => {
                    const subtitulo = subtituloCompromiso(item);
                    return <span key={`${item.tipo}-${item.dato.id}`}
                      className={`${styles.monthPreview} ${item.tipo === 'evento' ? styles.monthPreviewEvento : styles.monthPreviewTarea}`}>
                      <span className={styles.monthPreviewMain}>
                        <span className={styles.monthPreviewHora}>{item.dato.hora_inicio.slice(0, 5)}</span>
                        <span className={styles.monthPreviewTitulo}>{item.dato.titulo}</span>
                      </span>
                      <span className={styles.monthPreviewSub} style={subtitulo.color ? { color: subtitulo.color } : undefined}>
                        {subtitulo.texto}
                      </span>
                    </span>;
                  })}
                  {items.length > 2 && <span className={styles.detailLink}>Ver los {items.length} compromisos</span>}
                </div>}
              </button>}
          </td>;
        })}
      </tr>)}</tbody>
    </table>
    <section className={styles.monthDetails} aria-labelledby="detalle-dia-titulo">
      <h2 id="detalle-dia-titulo" tabIndex={-1} aria-live="polite">Compromisos del {fechaCompleta(diaSeleccionado)}</h2>
      <CompromisosDia items={porDia.get(diaSeleccionado) ?? []} onSeleccionar={onSeleccionar} />
    </section>
    <section className={styles.monthAgenda} aria-label={`Agenda de ${mes}`}>
      <h2>Compromisos de {mes}</h2>
      {!conCompromisos.length && <p>Sin compromisos registrados en este mes</p>}
      {conCompromisos.map(dia => <section key={claveDia(dia)} className={styles.day} aria-label={fechaCompleta(claveDia(dia))}>
        <h3 className={styles.dayTitle}>{fechaCompleta(claveDia(dia))}{claveDia(dia) === hoy && <span className={styles.todayLabel}>Hoy</span>}</h3>
        <div className={styles.dayContent}><CompromisosDia items={porDia.get(claveDia(dia))!} onSeleccionar={onSeleccionar} /></div>
      </section>)}
    </section>
  </>;
}
