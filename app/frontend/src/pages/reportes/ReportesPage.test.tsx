import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportesPage from './ReportesPage';
import { ROLES } from '../../utils/roles';
import apiClient from '../../api/client';

let rolActual: number = ROLES.ADMIN;
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ usuario: { rol_id: rolActual } }) }));
vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  rolActual = ROLES.ADMIN;
});

describe('ReportesPage', () => {
  it.each([ROLES.SACERDOTE, ROLES.ADMIN])('muestra ambos reportes al rol %s', (rol) => {
    rolActual = rol;
    render(<ReportesPage />);
    expect(screen.getByText('Reservas de salones')).toBeInTheDocument();
    expect(screen.getByText('Tareas y asignaciones')).toBeInTheDocument();
  });

  it('muestra solo tareas al coordinador de ministros', () => {
    rolActual = ROLES.COORDINADOR_MINISTROS;
    render(<ReportesPage />);
    expect(screen.queryByText('Reservas de salones')).not.toBeInTheDocument();
    expect(screen.getByText('Tareas y asignaciones')).toBeInTheDocument();
  });

  it('ofrece Excel primero, PDF segundo y CSV tercero', () => {
    rolActual = ROLES.COORDINADOR_MINISTROS;
    render(<ReportesPage />);
    const botones = screen.getAllByRole('button').slice(-3);
    expect(botones.map((boton) => boton.textContent)).toEqual(['Descargar Excel', 'Descargar PDF', 'Descargar CSV']);
    expect(botones[0].className).toMatch(/primary/);
    expect(botones[1].className).toMatch(/cream/);
    expect(botones[2].className).toMatch(/ghost/);
  });

  it('no descarga si el rango de tareas excede un mes', () => {
    rolActual = ROLES.COORDINADOR_MINISTROS;
    render(<ReportesPage />);
    const fechas = screen.getAllByLabelText(/Desde|Hasta/);
    fireEvent.change(fechas[0], { target: { value: '2026-01-01' } });
    fireEvent.change(fechas[1], { target: { value: '2026-02-15' } });
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeDisabled();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('solicita la descarga autenticada del reporte autorizado', async () => {
    rolActual = ROLES.COORDINADOR_MINISTROS;
    vi.mocked(apiClient.get).mockResolvedValue({ data: new Blob(['x'], { type: 'text/csv' }) });
    const crearUrl = vi.fn(() => 'blob:reporte');
    const revocarUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: crearUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revocarUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ReportesPage />);
    const tarea = screen.getByText('Tareas y asignaciones').closest('section') ?? document.body;
    fireEvent.click(within(tarea).getByRole('button', { name: 'Descargar CSV' }));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/reportes/tareas', expect.objectContaining({
      responseType: 'blob',
      params: expect.objectContaining({ formato: 'csv' }),
    })));
    expect(crearUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });

  it('solicita Excel como descarga autenticada', async () => {
    rolActual = ROLES.COORDINADOR_MINISTROS;
    vi.mocked(apiClient.get).mockResolvedValue({ data: new Blob(['x']) });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:excel') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ReportesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/reportes/tareas', expect.objectContaining({
      responseType: 'blob',
      params: expect.objectContaining({ formato: 'xlsx' }),
    })));
    click.mockRestore();
  });
});
