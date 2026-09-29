import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import type { NotificacionPapelera } from '../../../types';

interface UsePapeleraReturn {
  papelera: NotificacionPapelera[];
  cargando: boolean;
  error: string | null;
  restaurar: (id: number) => Promise<void>;
  vaciar: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePapelera(): UsePapeleraReturn {
  const [papelera, setPapelera] = useState<NotificacionPapelera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await apiClient.get<NotificacionPapelera[]>('/api/notificaciones/papelera');
      setPapelera(data);
    } catch {
      setError('No se pudo cargar la papelera.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const restaurar = useCallback(async (id: number) => {
    await apiClient.put(`/api/notificaciones/${id}/restaurar`);
    setPapelera((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const vaciar = useCallback(async () => {
    await apiClient.delete('/api/notificaciones/papelera');
    setPapelera([]);
  }, []);

  return { papelera, cargando, error, restaurar, vaciar, refetch };
}
