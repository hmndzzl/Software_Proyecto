import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import EspaciosPage from './EspaciosPage';
import apiClient from '../../api/client';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));

function Destino() { return <p>Destino {useLocation().pathname}</p>; }
function mostrar() {
  return render(<MemoryRouter initialEntries={['/espacios']}><Routes><Route path="/espacios" element={<EspaciosPage />} /><Route path="*" element={<Destino />} /></Routes></MemoryRouter>);
}

const espacios = [
  { id: 1, nombre: 'Salón', capacidad: 80, disponible: true },
  { id: 2, nombre: 'Capilla', capacidad: null, disponible: 0 },
  { id: 3, nombre: 'Patio', capacidad: 20, disponible: false },
];

describe('integración de consulta de espacios', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiClient.get).mockResolvedValue({ data: espacios }); });

  it('lista disponibilidad, capacidad y navega al detalle', async () => {
    mostrar();
    expect(await screen.findByText('Salón')).toBeInTheDocument();
    expect(screen.getByText('80 personas')).toBeInTheDocument();
    expect(screen.getAllByText('Ocupado')).toHaveLength(2);
    await userEvent.click(screen.getAllByRole('button', { name: 'Ver Detalle' })[0]);
    expect(await screen.findByText('Destino /espacios/1')).toBeInTheDocument();
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
});
