import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../../../../api/client';
import { usePapelera } from '../usePapelera';
import { useNotificaciones } from '../useNotificaciones';
import { useNotificacionesEnviadas } from '../useNotificacionesEnviadas';

vi.mock('../../../../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Notificaciones Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePapelera', () => {
    it('debería setear error si falla al cargar', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => usePapelera());
      
      await waitFor(() => {
        expect(result.current.cargando).toBe(false);
      });
      
      expect(result.current.error).toBe('No se pudo cargar la papelera.');
    });

    it('debería vaciar la papelera', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }] });
      const { result } = renderHook(() => usePapelera());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.vaciar();
      });

      expect(apiClient.delete).toHaveBeenCalledWith('/api/notificaciones/papelera');
      expect(result.current.papelera).toEqual([]);
    });

    it('debería restaurar un elemento', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });
      const { result } = renderHook(() => usePapelera());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.restaurar(1);
      });

      expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/restaurar');
      expect(result.current.papelera).toEqual([{ id: 2 }]);
    });
  });

  describe('useNotificacionesEnviadas', () => {
    it('debería setear error si falla al cargar', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useNotificacionesEnviadas(true));
      
      await waitFor(() => {
        expect(result.current.cargando).toBe(false);
      });
      
      expect(result.current.error).toBe('No se pudieron cargar las notificaciones enviadas.');
    });
  });

  describe('useNotificaciones', () => {
    it('debería capturar el error sin interrumpir UI si falla marcarLeida', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, leida: false }, { id: 2, leida: false }] });
      vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.marcarLeida(1);
      });
      expect(result.current.notificaciones[0].leida).toBe(false);
    });

    it('debería marcar una como leida exitosamente', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, leida: false }, { id: 2, leida: false }] });
      vi.mocked(apiClient.put).mockResolvedValueOnce({});
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.marcarLeida(1);
      });
      expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/leida');
      expect(result.current.notificaciones[0].leida).toBe(true);
    });

    it('debería marcar una como no leida exitosamente', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, leida: true }, { id: 2, leida: true }] });
      vi.mocked(apiClient.put).mockResolvedValueOnce({});
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.marcarNoLeida(1);
      });
      expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/no-leida');
      expect(result.current.notificaciones[0].leida).toBe(false);
    });

    it('debería capturar el error sin interrumpir UI si falla marcarNoLeida', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, leida: true }, { id: 2, leida: true }] });
      vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.marcarNoLeida(1);
      });
      expect(result.current.notificaciones[0].leida).toBe(true);
    });

    it('debería setear error al fallar refetch', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));
      expect(result.current.error).toBe('No se pudieron cargar las notificaciones.');
    });

    it('debería eliminar una notificacion', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.eliminar(1);
      });
      expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/papelera');
      expect(result.current.notificaciones).toEqual([{ id: 2 }]);
    });

    it('debería marcar todas como leidas', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, leida: false }, { id: 2, leida: false }] });
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.marcarTodasLeidas();
      });
      expect(result.current.notificaciones[0].leida).toBe(true);
      expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/leida');
    });

    it('debería confirmar asistencia exitosamente', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, asistencia_confirmada: false }, { id: 2, asistencia_confirmada: false }] });
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.confirmarAsistencia(1);
      });
      expect(result.current.notificaciones[0].asistencia_confirmada).toBe(true);
      expect(result.current.notificaciones[0].leida).toBe(true);
    });

    it('debería excusar asistencia exitosamente', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, asistencia_confirmada: null, motivo_excusa: null }, { id: 2, asistencia_confirmada: null, motivo_excusa: null }] });
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.excusarAsistencia(1, 'Enfermedad');
      });
      expect(result.current.notificaciones[0].asistencia_confirmada).toBe(false);
      expect(result.current.notificaciones[0].motivo_excusa).toBe('Enfermedad');
      expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/excusar', { motivo: 'Enfermedad' });
    });

    it('debería capturar el error sin interrumpir UI si falla confirmarAsistencia', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, asistencia_confirmada: false }, { id: 2, asistencia_confirmada: false }] });
      vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.confirmarAsistencia(1);
      });
      expect(result.current.notificaciones[0].asistencia_confirmada).toBe(false);
    });

    it('debería cancelar asistencia exitosamente', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, asistencia_confirmada: true }] });
      vi.mocked(apiClient.put).mockResolvedValueOnce({});
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.cancelarAsistencia(1);
      });
      expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/cancelar-asistencia');
      expect(result.current.notificaciones[0].asistencia_confirmada).toBe(false);
    });

    it('debería capturar el error sin interrumpir UI si falla cancelarAsistencia', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, asistencia_confirmada: true }] });
      vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.cancelarAsistencia(1);
      });
      expect(result.current.notificaciones[0].asistencia_confirmada).toBe(true);
    });

    it('debería cancelar inasistencia exitosamente', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, motivo_excusa: 'Motivo' }] });
      vi.mocked(apiClient.put).mockResolvedValueOnce({});
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.cancelarInasistencia(1);
      });
      expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/cancelar-inasistencia');
      expect(result.current.notificaciones[0].motivo_excusa).toBeNull();
    });

    it('debería capturar el error sin interrumpir UI si falla cancelarInasistencia', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, motivo_excusa: 'Motivo' }] });
      vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useNotificaciones());
      await waitFor(() => expect(result.current.cargando).toBe(false));

      await act(async () => {
        await result.current.cancelarInasistencia(1);
      });
      expect(result.current.notificaciones[0].motivo_excusa).toBe('Motivo');
    });
  });
});
