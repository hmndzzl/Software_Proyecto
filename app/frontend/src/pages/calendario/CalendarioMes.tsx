import { useState } from 'react';
import { DIAS_SEMANA } from '../../utils/date';
import CompromisosDia from './CompromisosDia';
import { claveDia, fechaCompleta, horaLegible, type Compromiso } from './calendario.utils';
import styles from './CalendarioPage.module.css';

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
          return <td key={clave}>
            {dia.getMonth() !== fecha.getMonth() ? <span className={styles.outsideMonth}>{dia.getDate()}</span>
              : <button type="button" className={styles.monthDay} aria-pressed={clave === diaSeleccionado}
                aria-label={`${fechaCompleta(clave)}${clave === hoy ? ', hoy' : ''}, ${items.length} compromisos`}
                onClick={() => setDiaSeleccionado(clave)}>
                <strong>{dia.getDate()}{clave === hoy && <span className={styles.todayLabel}>Hoy</span>}</strong>
                {items.slice(0, 2).map(item => <span key={`${item.tipo}-${item.dato.id}`} className={styles.monthPreview}>
                  {item.tipo === 'evento' ? 'Evento' : 'Tarea'} · {horaLegible(item.dato.hora_inicio)}<br />{item.dato.titulo}
                </span>)}
                {items.length > 2 ? <span className={styles.detailLink}>Ver los {items.length} compromisos</span>
                  : <span>{items.length ? `${items.length} compromiso${items.length === 1 ? '' : 's'}` : 'Sin compromisos'}</span>}
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
