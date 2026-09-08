import type { SortDir } from '../../hooks/useSortableTable';
import styles from './SortableTh.module.css';

// Icono de 3 estados: sin ordenar (flechas apagadas), descendente (flecha abajo), ascendente (flecha arriba)
function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'desc') {
    return (
      <svg className={styles.sortIconActivo} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" /><path d="m18 13-6 6-6-6" />
      </svg>
    );
  }
  if (dir === 'asc') {
    return (
      <svg className={styles.sortIconActivo} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" /><path d="m6 11 6-6 6 6" />
      </svg>
    );
  }
  return (
    <svg className={styles.sortIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
    </svg>
  );
}

interface SortableThProps<K extends string> {
  label: string;
  sortKey: K;
  activeKey: K | null;
  dir: SortDir;
  onSort: (key: K) => void;
}

export default function SortableTh<K extends string>({ label, sortKey, activeKey, dir, onSort }: SortableThProps<K>) {
  return (
    <th className={styles.thOrdenable} onClick={() => onSort(sortKey)}>
      <span className={styles.thContenido}>
        {label}
        <SortIcon dir={activeKey === sortKey ? dir : null} />
      </span>
    </th>
  );
}
