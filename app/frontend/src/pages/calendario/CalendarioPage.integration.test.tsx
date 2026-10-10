import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import CalendarioPage from './CalendarioPage';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));

const tareas = [
  { id: 1, fecha: '2026-10-05T12:00:00.000Z', hora_inicio: '10:00:00', hora_fin: '11:00:00', titulo: 'Lectura tarde', descripcion: '', persona_nombre: 'Ana', asignados: [] },
  { id: 2, fecha: '2026-10-05', hora_inicio: '08:00:00', hora_fin: '09:00:00', titulo: 'Lectura mañana', descripcion: '', persona_nombre: null, asignados: [{ persona_id: 7, nombre: 'Luis', correo: 'l@test.com', rol: 'Ministro' }] },
  { id: 3, fecha: '2026-10-06', hora_inicio: '', hora_fin: '', titulo: 'Sin asignar', descripcion: '', persona_nombre: null, asignados: [] },
  { id: 2, fecha: '2026-10-05', hora_inicio: '08:00:00', hora_fin: '09:00:00', titulo: 'Duplicada', descripcion: '', asignados: [] },
  { id: 4, fecha: '', hora_inicio: '12:00:00', hora_fin: '13:00:00', titulo: 'Sin fecha', descripcion: '', asignados: [] },
  { id: 5, fecha: '2026-10-05', hora_inicio: '08:00:00', hora_fin: '08:30:00', titulo: 'Mismo inicio', descripcion: '', asignados: [] },
  { id: 6, fecha: '2026-10-05', hora_inicio: null, hora_fin: null, titulo: 'Horas nulas', descripcion: '', asignados: [] },
];

describe('integración del calendario semanal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: tareas });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('consulta la semana, agrupa sin duplicados, ordena por hora y cubre asignaciones', async () => {
    render(<CalendarioPage />);
    await screen.findByText('Lectura mañana');
    expect(apiClient.get).toHaveBeenCalledWith('/api/tareas?fecha_inicio=2026-10-05&fecha_fin=2026-10-11');
    expect(screen.queryByText('Duplicada')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin fecha')).not.toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Luis')).toBeInTheDocument();
    expect(screen.getAllByText('Sin asignar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('--:-- – --:--')).toHaveLength(2);
    expect(screen.getAllByText('Sin tareas')).toHaveLength(5);

    const textos = Array.from(document.querySelectorAll('p')).map(n => n.textContent);
    expect(textos.indexOf('Lectura mañana')).toBeLessThan(textos.indexOf('Lectura tarde'));
  });

  it('navega a semana anterior, siguiente y vuelve a hoy', async () => {
    render(<CalendarioPage />);
    await screen.findByText('Lectura mañana');
    await userEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/tareas?fecha_inicio=2026-09-28&fecha_fin=2026-10-04'));
    expect(screen.getByText(/Septiembre al 4 de Octubre/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/tareas?fecha_inicio=2026-10-05&fecha_fin=2026-10-11'));
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByText(/5 al 11 de Octubre, 2026/)).toBeInTheDocument();
  });

  it('refresca silenciosamente al recuperar foco o visibilidad y limpia un error previo', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: tareas }).mockRejectedValueOnce(new Error('red')).mockResolvedValue({ data: tareas });
    render(<CalendarioPage />);
    await screen.findByText('Lectura mañana');
    fireEvent.focus(window);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/Error al cargar/)).not.toBeInTheDocument();

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    fireEvent(document, new Event('visibilitychange'));
    expect(apiClient.get).toHaveBeenCalledTimes(2);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(3));
  });

  it('muestra el error inicial y permite reintentar', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: [] });
    render(<CalendarioPage />);
    expect(await screen.findByText('Error al cargar las tareas del calendario.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    await waitFor(() => expect(screen.getAllByText('Sin tareas')).toHaveLength(7));
  });

  it('calcula correctamente el lunes cuando la fecha actual es domingo', async () => {
    vi.setSystemTime(new Date(2026, 9, 11, 12));
    render(<CalendarioPage />);
    await screen.findByText('Lectura mañana');
    expect(apiClient.get).toHaveBeenCalledWith('/api/tareas?fecha_inicio=2026-10-05&fecha_fin=2026-10-11');
  });
});
