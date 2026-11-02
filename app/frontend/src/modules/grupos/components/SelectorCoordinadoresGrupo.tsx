import { useId, useState } from 'react';
import type { Persona } from '../../../types';
import { normalizarBusqueda } from '../../../hooks/useTableFilters';
import form from '../../../styles/Form.module.css';
import styles from './SelectorCoordinadoresGrupo.module.css';

interface Props {
  personas: Pick<Persona, 'id' | 'nombre'>[];
  seleccionados: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  cargando?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export default function SelectorCoordinadoresGrupo({ personas, seleccionados, onChange, disabled = false, cargando = false, error = false, onRetry }: Props) {
  const id = useId();
  const [busqueda, setBusqueda] = useState('');
  const visibles = personas.filter((p) => normalizarBusqueda(p.nombre).includes(normalizarBusqueda(busqueda)));

  const alternar = (personaId: number) => {
    if (disabled) return;
    onChange(seleccionados.includes(personaId)
      ? seleccionados.filter((value) => value !== personaId)
      : [...seleccionados, personaId]);
  };

  return (
    <fieldset className={styles.selector} disabled={disabled || cargando}>
      <legend className={form.label}>Coordinadores</legend>
      <div className={form.field}>
        <label htmlFor={`${id}-buscar`} className={form.label}>Buscar coordinador</label>
        <input
          id={`${id}-buscar`}
          type="search"
          className={form.input}
          value={busqueda}
          placeholder="Buscar por nombre…"
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>
      <p className={styles.nota} aria-live="polite">
        {seleccionados.length === 1 ? '1 coordinador seleccionado.' : `${seleccionados.length} coordinadores seleccionados.`}
      </p>
      {cargando && <p className={styles.nota} role="status">Cargando coordinadores…</p>}
      {error && <p className={styles.nota} role="alert">No se pudieron cargar los coordinadores. <button type="button" className={form.btnSecondary} onClick={onRetry}>Reintentar</button></p>}
      {!cargando && !error && !personas.length && <p className={styles.nota}>No hay coordinadores de grupo disponibles.</p>}
      {!cargando && !error && personas.length > 0 && !visibles.length && <p className={styles.nota}>No hay coordinadores que coincidan con la búsqueda.</p>}
      <div className={styles.lista} role="group" aria-label="Coordinadores disponibles">
        {visibles.map((persona) => (
          <label key={persona.id} className={styles.opcion}>
            <input
              type="checkbox"
              value={persona.id}
              checked={seleccionados.includes(persona.id)}
              onChange={() => alternar(persona.id)}
            />
            <span>{persona.nombre}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
