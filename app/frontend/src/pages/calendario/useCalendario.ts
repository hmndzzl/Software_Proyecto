import { useEffect, useState } from 'react';
import { consultarCalendario, type Calendario, type VistaCalendario } from '../../api/calendario';

export function useCalendario(inicio: string, fin: string, vista: VistaCalendario, personaId: string) {
  const [datos, setDatos] = useState<Calendario>({ eventos: [], tareas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    let peticion = 0;
    const cargar = async (silencioso = false) => {
      const actual = ++peticion;
      if (!silencioso) { setLoading(true); setError(''); }
      try {
        const response = await consultarCalendario(inicio, fin, vista, personaId);
        if (vigente && actual === peticion) { setDatos(response.data); setError(''); }
      } catch {
        if (vigente && actual === peticion) setError('No se pudo actualizar el calendario. Reintenta para consultar los compromisos.');
      } finally {
        if (vigente && actual === peticion) setLoading(false);
      }
    };
    void cargar();
    const refrescar = () => { if (document.visibilityState === 'visible') void cargar(true); };
    window.addEventListener('focus', refrescar);
    document.addEventListener('visibilitychange', refrescar);
    return () => {
      vigente = false;
      window.removeEventListener('focus', refrescar);
      document.removeEventListener('visibilitychange', refrescar);
    };
  }, [inicio, fin, vista, personaId, intento]);
  return { datos, loading, error, reintentar: () => setIntento(n => n + 1) };
}
