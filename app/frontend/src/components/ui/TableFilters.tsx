import { useId } from 'react';
import type { TableFilterControls } from '../../hooks/useTableFilters';
import { InputUI, SelectUI } from './Field';
import Btn from './Btn';
import styles from './TableFilters.module.css';

export default function TableFilters({ label = 'Filtros de tabla', ...filters }: TableFilterControls & { label?: string }) {
  const id = useId();
  return (
    <section className={styles.wrap} aria-label={label}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor={`${id}-search`}>Buscar</label>
          <InputUI id={`${id}-search`} type="search" placeholder="Buscar en esta tabla…" value={filters.query} onChange={e => filters.setQuery(e.target.value)} />
        </div>
        {filters.selects.map(select => <div key={select.key} className={styles.field}>
          <label htmlFor={`${id}-${select.key}`}>{select.label}</label>
          <SelectUI id={`${id}-${select.key}`} value={select.value} onChange={e => select.onChange(e.target.value)}>
            <option value="">Todos</option>
            {select.options.map(option => <option key={option} value={option}>{option}</option>)}
            {select.value && !select.options.includes(select.value) && <option value={select.value}>{select.value}</option>}
          </SelectUI>
        </div>)}
        {filters.hasDates && <>
          <div className={styles.field}>
            <label htmlFor={`${id}-from`}>Desde</label>
            <InputUI id={`${id}-from`} type="date" value={filters.from} onChange={e => filters.setFrom(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-to`}>Hasta</label>
            <InputUI id={`${id}-to`} type="date" value={filters.to} onChange={e => filters.setTo(e.target.value)} />
          </div>
        </>}
        <Btn type="button" kind="ghost" disabled={!filters.active} onClick={filters.clear}>Limpiar filtros</Btn>
      </div>
      {filters.invalidRange && <p role="alert">La fecha inicial no puede ser posterior a la final.</p>}
      <p className={styles.summary} aria-live="polite">Mostrando {filters.count} de {filters.total} registros.</p>
      {filters.count === 0 && filters.total > 0 && !filters.invalidRange && <p className={styles.summary}>No hay resultados para los filtros seleccionados.</p>}
    </section>
  );
}
