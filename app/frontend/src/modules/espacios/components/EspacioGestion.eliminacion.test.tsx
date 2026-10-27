import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EspacioGestion from './EspacioGestion';
import apiClient from '../../../api/client';
const mocks = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ tieneRol: () => true }) }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ success: mocks.success }) }));
vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), delete: vi.fn() } }));
const espacio = { id: 7, nombre: 'Salón', capacidad: 30 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({ data: { reservas: [] } });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
});
describe('actualización después de eliminar un espacio', () => {
  it.each([true, false])('tras eliminar actualiza el destino configurado: %s', async conDestino => {
    const cambiado = vi.fn(); const eliminado = vi.fn();
    render(<EspacioGestion espacio={espacio} onChanged={cambiado} onDeleted={conDestino ? eliminado : undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar espacio' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar espacio' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(apiClient.delete).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Editar espacio' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar espacio' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.click(await dialog.findByRole('button', { name: 'Eliminar espacio' }));
    await waitFor(() => expect(conDestino ? eliminado : cambiado).toHaveBeenCalledOnce());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.success).toHaveBeenCalledWith('Espacio eliminado', expect.any(String));
  });

  it('mantiene los cambios sin guardar al cancelar la eliminación', async () => {
    render(<EspacioGestion espacio={espacio} onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Eliminar espacio' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar espacio' }));
    const nombre = screen.getByLabelText(/Nombre del espacio/);
    await userEvent.clear(nombre); await userEvent.type(nombre, 'Cambio sin guardar');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar espacio' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText(/Nombre del espacio/)).toHaveValue('Cambio sin guardar');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

});
