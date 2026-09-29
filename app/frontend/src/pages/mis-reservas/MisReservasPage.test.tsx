import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MisReservasPage from './MisReservasPage';
import apiClient from '../../api/client';
import { ROLES } from '../../utils/roles';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn() } }));

function Destino() {
  const { pathname, search } = useLocation();
  return <p>Destino {pathname}{search}</p>;
}

function mostrar(rolId: number) {
  localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id: rolId }));
  render(
    <MemoryRouter initialEntries={['/mis-reservas']}>
      <Routes>
        <Route path="/mis-reservas" element={<MisReservasPage />} />
        <Route path="/reservas" element={<Destino />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
});

describe('MisReservasPage — acceso a nueva reserva', () => {
  it('muestra "Nueva reserva" en el encabezado y lleva al formulario enfocado', async () => {
    mostrar(ROLES.COORDINADOR_GRUPOS);
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva reserva' }));
    expect(await screen.findByText('Destino /reservas?nueva=1')).toBeInTheDocument();
  });

  it('ofrece solicitar la primera reserva cuando el historial está vacío', async () => {
    mostrar(ROLES.SACERDOTE);
    fireEvent.click(await screen.findByRole('button', { name: 'Solicitar mi primera reserva' }));
    expect(await screen.findByText('Destino /reservas?nueva=1')).toBeInTheDocument();
  });

  it('no muestra accesos de creación a un ministro (sin permiso sobre /reservas)', async () => {
    mostrar(ROLES.MINISTRO);
    await screen.findByText('Aún no tienes reservas registradas.');
    expect(screen.queryByRole('button', { name: '+ Nueva reserva' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar mi primera reserva' })).not.toBeInTheDocument();
  });
});

const reservas = [
  { id: 7, fecha: '2099-10-12', hora_inicio: '18:00:00', hora_fin: '20:00:00', espacio_nombre: 'Salón Parroquial',
    estado_reserva_id: 1, evento_id: 3, evento_descripcion: 'Ensayo semanal', evento_titulo: 'Ensayo del coro' },
  { id: 8, fecha: '2099-10-13', hora_inicio: '09:00:00', hora_fin: '10:00:00', espacio_nombre: null,
    estado_reserva_id: 9, evento_id: null, evento_descripcion: null, evento_titulo: null },
];

describe('MisReservasPage — historial', () => {
  it('muestra KPI, filas y valores por defecto', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: reservas });
    mostrar(ROLES.COORDINADOR_GRUPOS);
    expect(await screen.findByText('Ensayo del coro')).toBeInTheDocument();
    expect(screen.getByText('2 solicitudes')).toBeInTheDocument();
    expect(screen.getByText('Sin título')).toBeInTheDocument();
    expect(screen.getByText('Sin evento')).toBeInTheDocument();
    expect(screen.getByText('Desconocido')).toBeInTheDocument();
    expect(screen.getByText('18:00–20:00')).toBeInTheDocument();
    // Ciclo completo sobre "#": desc -> asc -> sin ordenar
    fireEvent.click(screen.getByText('#'));
    fireEvent.click(screen.getByText('#'));
    fireEvent.click(screen.getByText('#'));
    fireEvent.click(screen.getByText('Fecha'));
    fireEvent.click(screen.getByText('Espacio'));
    fireEvent.click(screen.getByText('Estado'));
    expect(screen.getAllByRole('button', { name: 'Cancelar' })).toHaveLength(1);
  });

  it('muestra error y reintenta la carga', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red'));
    mostrar(ROLES.COORDINADOR_GRUPOS);
    expect(await screen.findByText('Error al cargar tus reservas.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('Aún no tienes reservas registradas.')).toBeInTheDocument();
  });

  it('cancela una reserva solo si se confirma', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: reservas });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    mostrar(ROLES.COORDINADOR_GRUPOS);
    const fila = (await screen.findByText('Ensayo del coro')).closest('tr')!;

    fireEvent.click(within(fila).getByRole('button', { name: 'Cancelar' }));
    expect(apiClient.put).not.toHaveBeenCalled();

    fireEvent.click(within(fila).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/7/estado', { estado_id: 4 }));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    confirmSpy.mockRestore();
  });

  it('avisa si falla la cancelación', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: reservas });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(apiClient.put)
      .mockRejectedValueOnce({ response: { data: { message: 'No permitido' } } })
      .mockRejectedValueOnce(new Error('red'));
    mostrar(ROLES.COORDINADOR_GRUPOS);
    const boton = await screen.findByRole('button', { name: 'Cancelar' });

    fireEvent.click(boton);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('No permitido'));
    fireEvent.click(boton);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error al cancelar la reserva'));
    vi.restoreAllMocks();
  });
});
