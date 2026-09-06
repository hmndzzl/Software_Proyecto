import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc' | null;

// Ciclo de 3 estados por columna: sin ordenar -> descendente -> ascendente -> sin ordenar.
// getValue mapea cada clave de columna a una función que extrae el valor comparable de una fila.
export function useSortableTable<T, K extends string>(
  data: T[],
  getValue: Record<K, (item: T) => string | number>
) {
  const [sortKey, setSortKey] = useState<K | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const toggleSort = (key: K) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
      return;
    }
    if (sortDir === 'desc') { setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortKey(null); setSortDir(null); return; }
    setSortDir('desc');
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const getVal = getValue[sortKey];
    const factor = sortDir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb) * factor;
      }
      return va < vb ? -1 * factor : va > vb ? 1 * factor : 0;
    });
  }, [data, sortKey, sortDir, getValue]);

  return { sortKey, sortDir, toggleSort, sortedData };
}
