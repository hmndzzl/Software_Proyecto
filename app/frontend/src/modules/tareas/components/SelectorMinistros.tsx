import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Ministro } from '../../../types';
import { normalizarBusqueda } from '../../../hooks/useTableFilters';
import Btn from '../../../components/ui/Btn';
import form from '../../../styles/Form.module.css';
import styles from './SelectorMinistros.module.css';

interface Props {
  ministros: Pick<Ministro, 'id' | 'nombre'>[];
  seleccionados: number[];
  yaAsignados: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

export default function SelectorMinistros({ ministros, seleccionados, yaAsignados, onChange, disabled = false }: Props) {
  const id = useId();
  const root = useRef<HTMLFieldSetElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const usandoPuntero = useRef(false);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [soloSeleccionados, setSoloSeleccionados] = useState(false);
  const visibles = ministros.filter(ministro => (!soloSeleccionados || seleccionados.includes(ministro.id))
    && normalizarBusqueda(ministro.nombre).includes(normalizarBusqueda(busqueda)));

  useEffect(() => {
    if (!abierto) return;
    const marcarPuntero = () => { usandoPuntero.current = true; };
    // Cerrar después del clic evita mover el botón de envío antes de activarlo.
    const cerrarFuera = (event: MouseEvent) => {
      usandoPuntero.current = false;
      if (root.current && !event.composedPath().includes(root.current)) setAbierto(false);
    };
    document.addEventListener('pointerdown', marcarPuntero, true);
    document.addEventListener('click', cerrarFuera);
    return () => {
      document.removeEventListener('pointerdown', marcarPuntero, true);
      document.removeEventListener('click', cerrarFuera);
      usandoPuntero.current = false;
    };
  }, [abierto]);

  const seleccionar = (ministroId: number) => {
    if (disabled || yaAsignados.includes(ministroId)) return;
    if (soloSeleccionados && seleccionados.includes(ministroId)) {
      root.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    }
    onChange(seleccionados.includes(ministroId)
      ? seleccionados.filter(value => value !== ministroId) : [...seleccionados, ministroId]);
  };

  const recorrer = (event: KeyboardEvent<HTMLDivElement>) => {
    const opciones = Array.from(lista.current?.querySelectorAll<HTMLInputElement>('input:not(:disabled)') ?? []);
    const actual = opciones.indexOf(document.activeElement as HTMLInputElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      opciones[Math.max(0, Math.min(opciones.length - 1, actual + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus();
    } else if (event.key === 'Enter' && actual >= 0) {
      event.preventDefault();
      seleccionar(Number(opciones[actual].value));
    }
  };

  return (
    <fieldset ref={root} className={styles.selector} disabled={disabled}
      onBlur={event => { if (!usandoPuntero.current && !event.currentTarget.contains(event.relatedTarget)) setAbierto(false); }}
      onKeyDown={event => {
        usandoPuntero.current = false;
        if (event.key === 'Escape' && abierto) {
          event.preventDefault();
          event.stopPropagation();
          setAbierto(false);
          toggle.current?.focus();
        }
      }}>
      <legend className={form.label}>Ministros</legend>
      <div className={form.field}>
        <label htmlFor={`${id}-buscar`} className={form.label}>Buscar ministro</label>
        <div className={styles.busqueda}>
          <input id={`${id}-buscar`} type="search" className={form.input} value={busqueda}
            placeholder="Buscar por nombre…" aria-describedby={`${id}-ayuda`}
            onFocus={() => { if (!abierto) setSoloSeleccionados(false); setAbierto(true); }}
            onChange={event => { setBusqueda(event.target.value); setAbierto(true); }}
            onKeyDown={event => {
              if (event.key === 'Enter') { event.preventDefault(); setAbierto(true); }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (abierto) lista.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
                else setAbierto(true);
              }
            }} />
          <button ref={toggle} type="button" className={styles.toggle} aria-controls={`${id}-opciones`}
            aria-expanded={abierto} disabled={disabled || !ministros.length}
            aria-label={`${abierto ? 'Ocultar' : 'Mostrar'} opciones de ministros`}
            title={`${abierto ? 'Ocultar' : 'Mostrar'} opciones de ministros`}
            onClick={() => {
              setAbierto(!abierto);
              setSoloSeleccionados(false);
              setBusqueda('');
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>
      </div>
      <div className={styles.resumen}>
        <p className={styles.nota} aria-live="polite">
          {seleccionados.length === 1 ? '1 ministro seleccionado.' : `${seleccionados.length} ministros seleccionados.`}
        </p>
        <Btn type="button" kind="ghost" size="sm" disabled={disabled || !seleccionados.length}
          aria-controls={`${id}-opciones`} aria-expanded={abierto && soloSeleccionados}
          onClick={() => { setSoloSeleccionados(true); setBusqueda(''); setAbierto(true); }}>Ver seleccionados</Btn>
      </div>
      <p id={`${id}-ayuda`} className={styles.nota}>Busca y selecciona uno o varios ministros.</p>
      {!ministros.length && <p className={styles.nota}>No hay ministros disponibles en tu directorio para asignar.</p>}
      <div id={`${id}-opciones`} hidden={!abierto} className={styles.panel}>
        <p className={styles.nota} aria-live="polite">
          {soloSeleccionados ? 'Seleccionados' : 'Disponibles'}: {visibles.length}
        </p>
        {soloSeleccionados && <Btn type="button" kind="ghost" size="sm"
          onClick={() => { setSoloSeleccionados(false); setBusqueda(''); }}>Ver todos</Btn>}
        {!visibles.length && <p className={styles.nota}>
          {soloSeleccionados && !seleccionados.length ? 'No hay ministros seleccionados.' : 'No hay ministros que coincidan con la búsqueda.'}
        </p>}
        <div ref={lista} className={styles.lista} role="group" aria-label="Ministros disponibles" onKeyDown={recorrer}>
          {visibles.map(ministro => <label key={ministro.id} className={styles.opcion}>
            <input type="checkbox" value={ministro.id} checked={seleccionados.includes(ministro.id) || yaAsignados.includes(ministro.id)}
              disabled={yaAsignados.includes(ministro.id)} onChange={() => seleccionar(ministro.id)} />
            <span>{ministro.nombre}{yaAsignados.includes(ministro.id) ? ' (ya asignado)' : ''}</span>
          </label>)}
        </div>
      </div>
    </fieldset>
  );
}
