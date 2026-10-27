import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import DisponibilidadPeriodos from './DisponibilidadPeriodos';
vi.mock('../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
const ministro = { id: 9, nombre: 'Ana', correo: 'ana@example.com', disponible: true };
const periodo = { id: 1, desde: '2026-12-10T10:00', hasta: '2026-12-15T18:00', origen: 'disponibilidad' };
const abrir = () => render(<DisponibilidadPeriodos ministro={ministro} onClose={vi.fn()} />);
beforeEach(() => {
  vi.resetAllMocks(); vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
  vi.mocked(apiClient.post).mockResolvedValue({ data: periodo }); vi.mocked(apiClient.delete).mockResolvedValue({});
});
const completar = (desde = periodo.desde, hasta = periodo.hasta) => {
  fireEvent.change(screen.getByLabelText('No disponible desde'), { target: { value: desde } });
  fireEvent.change(screen.getByLabelText('Disponible nuevamente el'), { target: { value: hasta } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar periodo no disponible' }));
};
it('registra y retira rangos sin cambiar la disponibilidad general', async () => {
  abrir(); await screen.findByText('No hay periodos registrados.'); completar();
  const quitar = await screen.findByRole('button', { name: /Quitar periodo del/ });
  expect(apiClient.post).toHaveBeenCalledWith('/api/personas/9/disponibilidad/periodos', { desde: periodo.desde, hasta: periodo.hasta });
  expect(screen.getByLabelText('No disponible desde')).toHaveValue('');
  fireEvent.click(quitar);
  await screen.findByText('No hay periodos registrados.');
  expect(apiClient.delete).toHaveBeenCalledWith('/api/personas/9/disponibilidad/periodos/1');
});
it('presenta ausencias existentes sin permitir borrarlas desde disponibilidad', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: [{ ...periodo, origen: 'ausencia' }] });
  abrir(); await screen.findByText(/Ausencia reportada/);
  expect(screen.queryByRole('button', { name: /Quitar periodo/ })).not.toBeInTheDocument();
});
it('valida el rango y conserva los datos si falla guardar', async () => {
  abrir(); await screen.findByText('No hay periodos registrados.'); completar(periodo.hasta, periodo.desde);
  expect(await screen.findByText('El inicio debe ser anterior al fin.')).toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled();
  vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('red')); completar();
  await screen.findByText('No se pudo guardar el periodo.');
  expect(screen.getByLabelText('No disponible desde')).toHaveValue(periodo.desde);
});
it('recupera carga fallida y conserva el periodo si falla quitar', async () => {
  vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValue({ data: [periodo] });
  abrir(); await screen.findByText('No se pudieron cargar los periodos.');
  fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
  const quitar = await screen.findByRole('button', { name: /Quitar periodo del/ });
  vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('red')); fireEvent.click(quitar);
  await screen.findByText('No se pudo quitar el periodo.');
  await waitFor(() => expect(quitar).not.toBeDisabled());
});
