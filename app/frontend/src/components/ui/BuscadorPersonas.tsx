import { useEffect, useRef, useState } from 'react';
import { normalizarBusqueda } from '../../hooks/useTableFilters';
import formStyles from '../../styles/Form.module.css';
import styles from './BuscadorPersonas.module.css';

interface PersonaOpcion {
  id: number;
  nombre: string;
}

interface BuscadorPersonasProps {
  id: string;
  label: string;
  personas: PersonaOpcion[];
  valor: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Selector de persona con filtro por texto — reemplaza un <select> plano cuando
 * la lista puede tener decenas de opciones (RTF2-06: "sobrecarga la interfaz"). */
export default function BuscadorPersonas({ id, label, personas, valor, onChange, disabled, placeholder }: BuscadorPersonasProps) {
  const seleccionada = personas.find(p => String(p.id) === valor);
  const [busqueda, setBusqueda] = useState(seleccionada?.nombre ?? '');
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBusqueda(seleccionada?.nombre ?? '');
  }, [valor]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current || wrapRef.current.contains(e.target as Node)) return;
      setAbierto(false);
      setBusqueda(seleccionada?.nombre ?? '');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [seleccionada]);

  const resultados = personas.filter(p => normalizarBusqueda(p.nombre).includes(normalizarBusqueda(busqueda)));
  const listaId = `${id}-lista`;

  const elegir = (persona: PersonaOpcion) => {
    onChange(String(persona.id));
    setBusqueda(persona.nombre);
    setAbierto(false);
  };

  return (
    <div className={formStyles.field}>
      <label htmlFor={id} className={formStyles.label}>{label}</label>
      <div className={styles.wrap} ref={wrapRef}>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listaId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          className={formStyles.input}
          value={busqueda}
          onChange={e => {
            setBusqueda(e.target.value);
            setAbierto(true);
            if (!e.target.value) onChange('');
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setAbierto(false); setBusqueda(seleccionada?.nombre ?? ''); }
            if (e.key === 'Enter' && resultados.length === 1) { e.preventDefault(); elegir(resultados[0]); }
          }}
        />
        {abierto && (
          <ul id={listaId} role="listbox" className={styles.lista}>
            {resultados.length === 0 ? (
              <li className={styles.vacio}>Sin coincidencias</li>
            ) : resultados.map(persona => (
              <li key={persona.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={String(persona.id) === valor}
                  className={styles.opcion}
                  onClick={() => elegir(persona)}
                >
                  {persona.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
