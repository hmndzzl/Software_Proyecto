import { useState } from 'react';
import EspacioFoto from '../../espacios/components/EspacioFoto';
import type { Espacio } from '../../espacios/components/EspacioCard';
import { normalizarBusqueda } from '../../../hooks/useTableFilters';
import styles from './SelectorEspacios.module.css';

interface Props {
  espacios: Espacio[];
  valor: string;
  onChange: (id: string) => void;
  labelId: string;
  cargando?: boolean;
  disabled?: boolean;
}

// A partir de este número de espacios aparece el buscador — por debajo, una grilla
// simple ya se ve completa de un vistazo y el buscador solo estorbaría.
const UMBRAL_BUSCADOR = 8;
const LIMITE_INICIAL = 8;

export default function SelectorEspacios({ espacios, valor, onChange, labelId, cargando = false, disabled = false }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [verTodos, setVerTodos] = useState(false);

  if (!espacios.length) {
    return (
      <p className={styles.vacio} role="group" aria-labelledby={labelId}>
        {cargando ? 'Cargando espacios…' : 'No hay espacios disponibles.'}
      </p>
    );
  }

  const filtrados = espacios.filter((esp) => normalizarBusqueda(esp.nombre).includes(normalizarBusqueda(busqueda)));
  // Mientras se busca, se muestran todos los resultados — ya están acotados por el texto escrito.
  const visibles = busqueda || verTodos ? filtrados : filtrados.slice(0, LIMITE_INICIAL);
  const restantes = filtrados.length - visibles.length;

  return (
    <div>
      {espacios.length > UMBRAL_BUSCADOR && (
        <input
          type="search"
          className={styles.buscar}
          placeholder="Buscar espacio por nombre…"
          aria-label="Buscar espacio"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setVerTodos(false); }}
        />
      )}

      <div className={styles.grid} role="group" aria-labelledby={labelId}>
        {visibles.map((esp) => {
          const seleccionado = String(esp.id) === valor;
          const activar = () => { if (!disabled) onChange(String(esp.id)); };
          return (
            <div
              key={esp.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-disabled={disabled}
              aria-pressed={seleccionado}
              aria-label={`${esp.nombre}, capacidad ${esp.capacidad ?? 'no definida'}`}
              className={`${styles.tarjeta}${seleccionado ? ` ${styles.seleccionada}` : ''}`}
              onClick={activar}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activar(); } }}
            >
              <EspacioFoto className={styles.foto} nombre={esp.nombre} fotoUrl={esp.foto_url} />
              <span className={styles.nombre}>{esp.nombre}</span>
              <span className={styles.capacidad}>{esp.capacidad != null ? `Cap. ${esp.capacidad}` : 'Sin capacidad definida'}</span>
            </div>
          );
        })}
      </div>

      {filtrados.length === 0 && (
        <p className={styles.vacio}>No hay espacios que coincidan con «{busqueda}».</p>
      )}

      {!busqueda && restantes > 0 && (
        <button type="button" className={styles.verMas} onClick={() => setVerTodos(true)}>
          Ver {restantes} más
        </button>
      )}
    </div>
  );
}
