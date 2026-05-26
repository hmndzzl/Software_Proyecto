import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import type { Notificacion } from '../../../types';

interface UseNotificacionesReturn {
  notificaciones: Notificacion[];
  cargando: boolean;
  error: string | null;
  marcarLeida: (id: number) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotificaciones(): UseNotificacionesReturn {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Notificacion[]>('/api/notificaciones');
      setNotificaciones(data);
    } catch {
      setError('No se pudieron cargar las notificaciones.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const marcarLeida = useCallback(async (id: number) => {
    try {
      await apiClient.put(`/api/notificaciones/${id}/leida`);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
    } catch {
      // no interrumpir UI — notif sigue visible
    }
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    const noLeidas = notificaciones.filter((n) => !n.leida);
    await Promise.allSettled(
      noLeidas.map((n) => apiClient.put(`/api/notificaciones/${n.id}/leida`))
    );
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  }, [notificaciones]);

  return { notificaciones, cargando, error, marcarLeida, marcarTodasLeidas, refetch };
}
