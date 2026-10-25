import { useRef, useState } from 'react';
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
  const detalleRef = useRef<HTMLElement>(null);
  // El panel con los compromisos del día queda debajo de la tabla, fuera de vista
  // en pantallas chicas o meses con muchas filas — sin este scroll, "Ver todos los
  // compromisos"/"Ver los N compromisos" parece no hacer nada.
  const seleccionarDia = (clave: string) => {
    setDiaSeleccionado(clave);
    detalleRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  const hoy = claveDia(new Date());
  const mes = fecha.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
  const delMes = dias.filter(d => d.getMonth() === fecha.getMonth());
  const conCompromisos = delMes.filter(d => (porDia.get(claveDia(d))?.length ?? 0) > 0);
  return <>
    <table className={styles.monthTable}>
      <caption>Calendario de {mes}. Toca un compromiso para ver su detalle, o el número del día para ver todos los de esa fecha.</caption>
      <thead><tr>{DIAS_SEMANA.map(d => <th key={d} scope="col">{d}</th>)}</tr></thead>
      <tbody>{Array.from({ length: dias.length / 7 }, (_, semana) => <tr key={semana}>
        {dias.slice(semana * 7, semana * 7 + 7).map(dia => {
          const clave = claveDia(dia);
          const items = porDia.get(clave) ?? [];
          const esHoy = clave === hoy;
          const descripcionDia = `${fechaCompleta(clave)}${esHoy ? ', hoy' : ''}, ${items.length} compromiso${items.length === 1 ? '' : 's'}`;
          const delMesActual = dia.getMonth() === fecha.getMonth();
          return <td key={clave} aria-label={delMesActual ? descripcionDia : undefined}
            className={delMesActual ? styles.monthCell : undefined}
            onClick={delMesActual ? () => seleccionarDia(clave) : undefined}>
            {!delMesActual ? <span className={styles.outsideMonth}>{dia.getDate()}</span>
              : <div className={`${styles.monthDay}${esHoy ? ` ${styles.monthDayToday}` : ''}`}>
                <button type="button" className={styles.monthDayNumBtn} aria-pressed={clave === diaSeleccionado}
                  aria-label={`Ver todos los compromisos: ${descripcionDia}`}
                  onClick={() => seleccionarDia(clave)}>
                  <span className={styles.monthDayNum}>
                    {dia.getDate()}
                    {esHoy && <span className={styles.todayLabel}>Hoy</span>}
                  </span>
                </button>
                {items.length > 0 && <div className={styles.monthPreviewList}>
                  {items.slice(0, 2).map(item => {
                    const subtitulo = subtituloCompromiso(item);
                    return <button key={`${item.tipo}-${item.dato.id}`} type="button"
                      className={`${styles.monthPreview} ${item.tipo === 'evento' ? styles.monthPreviewEvento : styles.monthPreviewTarea}`}
                      aria-label={`Ver detalle ${item.tipo === 'evento' ? 'del evento' : 'de la tarea'} ${item.dato.titulo}`}
                      onClick={() => onSeleccionar(item)}>
                      <span className={styles.monthPreviewMain}>
                        <span className={styles.monthPreviewHora}>{item.dato.hora_inicio.slice(0, 5)}</span>
                        <span className={styles.monthPreviewTitulo}>{item.dato.titulo}</span>
                      </span>
                      <span className={styles.monthPreviewSub} style={subtitulo.color ? { color: subtitulo.color } : undefined}>
                        {subtitulo.texto}
                      </span>
                    </button>;
                  })}
                  {items.length > 2 && (
                    <button type="button" className={styles.detailLink} onClick={() => seleccionarDia(clave)}>
                      Ver los {items.length} compromisos
                    </button>
                  )}
                </div>}
              </div>}
          </td>;
        })}
      </tr>)}</tbody>
    </table>
    <section ref={detalleRef} className={styles.monthDetails} aria-labelledby="detalle-dia-titulo">
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
