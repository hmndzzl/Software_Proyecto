import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import EspaciosPage from './EspaciosPage';
import apiClient from '../../api/client';
import { AuthProvider } from '../../context/AuthContext';
import { saveSession } from '../../auth/sessionStore';
import { ToastProvider } from '../../context/ToastContext';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

function Destino() { return <p>Destino {useLocation().pathname}</p>; }
function mostrar() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/espacios']}><Routes><Route path="/espacios" element={<AuthProvider><ToastProvider><EspaciosPage /></ToastProvider></AuthProvider>} /><Route path="*" element={<Destino />} /></Routes></MemoryRouter>);
}

const espacios = [
  { id: 1, nombre: 'Salón', capacidad: 80, disponible: true, foto_url: '/uploads/espacios/salon-01-v1.webp' },
  { id: 2, nombre: 'Capilla', capacidad: null, disponible: 0 },
  { id: 3, nombre: 'Patio', capacidad: 20, disponible: false, en_uso: true },
];

describe('integración de consulta de espacios', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.mocked(apiClient.get).mockResolvedValue({ data: espacios }); vi.mocked(apiClient.post).mockResolvedValue({ data: { espacioId: 4 } }); });
  afterEach(() => { localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it('lista disponibilidad, capacidad y navega al detalle', async () => {
    mostrar();
    expect(await screen.findByText('Salón')).toBeInTheDocument();
    const foto = screen.getByRole('img', { name: 'Fotografía de Salón' });
    expect(foto).toHaveAttribute('src', '/uploads/espacios/salon-01-v1.webp');
    expect(screen.getByText('80 personas')).toBeInTheDocument();
    expect(screen.getAllByText('Ocupado')).toHaveLength(2);
    expect(screen.getByText('En uso ahora')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Ver detalle' })[0]);
    expect(await screen.findByText('Destino /espacios/1')).toBeInTheDocument();
  });

  it('recupera el marcador de posición si la fotografía falla', async () => {
    mostrar();
    const foto = await screen.findByRole('img', { name: 'Fotografía de Salón' });
    fireEvent.error(foto);
    expect(screen.getAllByText('Fotografía no disponible')[0]).toBeInTheDocument();
  });

  it('exige los tres filtros y valida el orden horario', async () => {
    mostrar();
    await screen.findByText('Salón');
    const fecha = document.querySelector<HTMLInputElement>('input[type="date"]')!;
    const [inicio, fin] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="time"]'));
    fireEvent.change(fecha, { target: { value: '2099-10-20' } });
    expect(screen.getByText(/Completa fecha/)).toBeInTheDocument();
    fireEvent.change(inicio, { target: { value: '16:00' } });
    fireEvent.change(fin, { target: { value: '15:00' } });
    expect(screen.getByText(/hora de inicio debe ser menor/)).toBeInTheDocument();
    fireEvent.change(inicio, { target: { value: '14:00' } });
    await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith('/api/espacios', { params: { fecha: '2099-10-20', hora_inicio: '14:00', hora_fin: '15:00' } }));
  });

  it('muestra vacío y recupera errores específicos', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce({ response: { data: { message: 'Servicio no disponible' } } }).mockResolvedValue({ data: [] });
    mostrar();
    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('No hay espacios registrados.')).toBeInTheDocument();
  });

  it('ignora una respuesta tardía después de desmontarse', async () => {
    let resolver!: (value: { data: typeof espacios }) => void;
    vi.mocked(apiClient.get).mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
    const vista = mostrar();
    vista.unmount();
    await act(async () => resolver({ data: espacios }));
    expect(screen.queryByText('Salón')).not.toBeInTheDocument();
  });

  it('ignora también un error tardío después de desmontarse', async () => {
    let rechazar!: (reason: Error) => void;
    vi.mocked(apiClient.get).mockImplementationOnce(() => new Promise((_resolve, reject) => { rechazar = reject; }));
    const vista = mostrar();
    vista.unmount();
    await act(async () => rechazar(new Error('red')));
    expect(screen.queryByText('Error al cargar los espacios')).not.toBeInTheDocument();
  });
  it.each([false, true])('refresca tras crear y conserva solo filtros completos: %s', async completos => {
    saveSession('token-prueba', { id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 });
    mostrar(); await screen.findByText('Salón');
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2099-11-01' } });
    if (completos) {
      fireEvent.change(screen.getByLabelText('Hora inicio'), { target: { value: '10:00' } });
      fireEvent.change(screen.getByLabelText('Hora fin'), { target: { value: '11:00' } });
      await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith('/api/espacios', { params: { fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00' } }));
    }
    await userEvent.click(screen.getByRole('button', { name: 'Crear espacio' }));
    await userEvent.type(screen.getByLabelText(/Nombre del espacio/), 'Nuevo salón');
    await userEvent.type(screen.getByLabelText(/Capacidad/), '20');
    vi.mocked(apiClient.get).mockResolvedValue({ data: [...espacios, { id: 4, nombre: 'Nuevo salón', capacidad: 20 }] });
    await userEvent.click(screen.getByRole('dialog').querySelector<HTMLButtonElement>('button[type="submit"]')!);
    expect(await screen.findByRole('heading', { name: 'Nuevo salón' })).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha')).toHaveValue(completos ? '2099-11-01' : '');
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/espacios', { params: completos ? { fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00' } : undefined });
  });

  it('muestra fecha y hora de la consulta en Guatemala y cambia la referencia al filtrar', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ ...espacios[0], consultado_en: '2026-10-27T15:30:00Z' }] });
    mostrar();
    expect(await screen.findByText('27 de octubre de 2026 · 09:30')).toBeInTheDocument();
    expect(screen.getByText(/Disponibilidad actual/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2099-11-01' } });
    expect(screen.queryByText(/Disponibilidad actual/)).not.toBeInTheDocument();
    expect(screen.getByText('Sin consultar')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hora inicio'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Hora fin'), { target: { value: '11:00' } });
    expect(await screen.findByText('1 de noviembre de 2099')).toBeInTheDocument();
    expect(screen.getByText(/Disponibilidad para/)).toHaveTextContent('10:00 – 11:00');
  });

  it('actualiza cada minuto sin desmontar una edición abierta y conserva la consulta ante errores de red', async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    saveSession('token-prueba', { id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 });
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ ...espacios[0], consultado_en: '2026-10-27T15:30:00Z' }] });
    await act(async () => { mostrar(); });
    fireEvent.click(screen.getByRole('button', { name: 'Editar espacio' }));
    fireEvent.change(screen.getByLabelText(/Nombre del espacio/), { target: { value: 'Edición sin guardar' } });
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ ...espacios[0], disponible: false, consultado_en: '2026-10-27T15:31:00Z' }] });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByLabelText(/Nombre del espacio/)).toHaveValue('Edición sin guardar');
    expect(screen.getByText('Ocupado')).toBeInTheDocument();
    expect(screen.getByText('27 de octubre de 2026 · 09:31')).toBeInTheDocument();
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red'));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByLabelText(/Nombre del espacio/)).toHaveValue('Edición sin guardar');
    expect(screen.getByText(/Última consulta/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Se conserva la última consulta');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await act(async () => {});
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/Disponibilidad actual/)).toBeInTheDocument();
  });

  it('omite consultas con la pestaña oculta y actualiza al volver', async () => {
    vi.useFakeTimers();
    const visibilidad = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(async () => { mostrar(); });
    expect(apiClient.get).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(apiClient.get).toHaveBeenCalledOnce();
    visibilidad.mockReturnValue('visible');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(apiClient.get).toHaveBeenCalledTimes(2);
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(apiClient.get).toHaveBeenCalledTimes(3);
  });

});
