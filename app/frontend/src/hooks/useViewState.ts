import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readUsuario } from '../auth/sessionStore';

/** Preferencias de vista por usuario y pestaña; nunca almacena datos del API. */
export function useViewState<T>(key: string | undefined, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = key ? `vista:${readUsuario()?.id ?? 'publico'}:${key}` : undefined;
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = storageKey && sessionStorage.getItem(storageKey);
      if (!saved) return initial;
      const parsed: unknown = JSON.parse(saved);
      if (typeof parsed !== typeof initial || parsed === null || Array.isArray(parsed)) return initial;
      if (typeof parsed === 'object' && !Object.values(parsed).every(value => typeof value === 'string')) return initial;
      return parsed as T;
    } catch { return initial; }
  });
  useEffect(() => {
    if (storageKey) { try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* La vista funciona sin almacenamiento. */ } }
  }, [storageKey, value]);
  return [value, setValue];
}
