import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import type { NotificacionEnviada } from '../../../types';

interface UseNotificacionesEnviadasReturn {
  enviadas: NotificacionEnviada[];
  cargando: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// enabled=false evita la petición para roles que no pueden enviar notificaciones
// (el backend la rechazaría con 403 de todas formas, pero así no la ni intenta).
export function useNotificacionesEnviadas(enabled: boolean): UseNotificacionesEnviadasReturn {
  const [enviadas, setEnviadas] = useState<NotificacionEnviada[]>([]);
  const [cargando, setCargando] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await apiClient.get<NotificacionEnviada[]>('/api/notificaciones/enviadas');
      setEnviadas(data);
    } catch {
      setError('No se pudieron cargar las notificaciones enviadas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) refetch();
  }, [refetch, enabled]);

  return { enviadas, cargando, error, refetch };
}
