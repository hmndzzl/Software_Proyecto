import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import apiClient from '../../../api/client';
import EventoTareaSelect from './EventoTareaSelect';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it('conserva la relación actual cuando falla la carga y permite reintentar', async () => {
  vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValue({ data: [] });
  const change = vi.fn();
  render(<EventoTareaSelect value={8} onChange={change} />);
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Misa o evento asociado (opcional)')).toHaveValue('8');
  expect(change).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar eventos' }));
  await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled());
  await userEvent.selectOptions(screen.getByRole('combobox'), '');
  expect(change).toHaveBeenCalledWith(null, undefined);
});

it('no ofrece eventos cancelados nuevos y conserva el cancelado ya asociado', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: [
    { id: 8, descripcion: 'Misa cancelada', fecha: '2026-10-24', hora_inicio: '10:00', estado_reserva_id: 4 },
    { id: 9, titulo: 'Otra cancelada', fecha: '2026-10-24', hora_inicio: '10:00', estado_reserva_id: 4 },
    { id: 10, titulo: 'Pendiente', fecha: '2026-10-25', hora_inicio: '10:00', estado_reserva_id: 1 },
  ] });
  render(<EventoTareaSelect value={8} onChange={vi.fn()} />);
  await screen.findByRole('option', { name: /Misa cancelada/ });
  expect(screen.queryByRole('option', { name: /Otra cancelada/ })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: /Pendiente de aprobación/ })).toBeInTheDocument();
});
