import { useState } from 'react';

type SearchValue = string | number | null | undefined;
export interface TableSelectFilter<T> {
  key: string;
  label: string;
  value: (item: T) => string | string[];
}
interface FilterConfig<T> {
  search: (item: T) => SearchValue[];
  date?: (item: T) => string | null | undefined;
  selects?: TableSelectFilter<T>[];
}

export function normalizarBusqueda(value: SearchValue): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

/** Filtra solo los datos que la API ya autorizó; nunca modifica la lista original. */
export function useTableFilters<T>(data: T[], config: FilterConfig<T>) {
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const selects = config.selects ?? [];
  const invalidRange = Boolean(config.date && from && to && from > to);
  const terms = normalizarBusqueda(query).split(/\s+/).filter(Boolean);
  const filteredData = data.filter(item => {
    if (invalidRange) return false;
    const text = normalizarBusqueda(config.search(item).join(' '));
    if (!terms.every(term => text.includes(term))) return false;
    if (!selects.every(filter => {
      if (!selected[filter.key]) return true;
      const values = filter.value(item);
      return Array.isArray(values) ? values.includes(selected[filter.key]) : values === selected[filter.key];
    })) return false;
    if (config.date && (from || to)) {
      const date = config.date(item)?.slice(0, 10);
      if (!date || (from && date < from) || (to && date > to)) return false;
    }
    return true;
  });
  const active = Boolean(query || from || to || Object.values(selected).some(Boolean));
  const clear = () => { setQuery(''); setFrom(''); setTo(''); setSelected({}); };

  return {
    filteredData,
    controls: {
      query, setQuery, from, setFrom, to, setTo, active, clear, invalidRange,
      hasDates: Boolean(config.date), total: data.length, count: filteredData.length,
      selects: selects.map(filter => ({
        key: filter.key, label: filter.label, value: selected[filter.key] ?? '',
        options: [...new Set(data.flatMap(filter.value).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
        onChange: (value: string) => setSelected(previous => ({ ...previous, [filter.key]: value })),
      })),
    },
  };
}

export type TableFilterControls = ReturnType<typeof useTableFilters>['controls'];
