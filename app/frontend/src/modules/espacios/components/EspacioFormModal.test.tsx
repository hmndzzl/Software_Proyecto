import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EspacioFormModal from './EspacioFormModal';
import apiClient from '../../../api/client';

vi.mock('../../../api/client', () => ({ default: { post: vi.fn(), put: vi.fn() } }));
const espacio = { id: 7, nombre: 'Salón', capacidad: 20 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
});

describe('validación y envío de espacios', () => {
  it('exige nombre y capacidad y permite completar un espacio antiguo sin capacidad', async () => {
    render(<EspacioFormModal espacio={{ ...espacio, capacidad: null }} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText(/Nombre del espacio/)).toBeRequired();
    const capacidad = screen.getByLabelText(/Capacidad/);
    expect(capacidad).toBeRequired(); expect(capacidad).toHaveValue(null);
    await userEvent.type(capacidad, '35');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect((vi.mocked(apiClient.put).mock.calls[0][1] as FormData).get('capacidad')).toBe('35');
  });
  it.each(['', '0', '-1', '1.5', '2147483648'])('no envía capacidad inválida %j incluso con envío programático', capacidad => {
    render(<EspacioFormModal espacio={espacio} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Capacidad/), { target: { value: capacidad } });
    fireEvent.submit(screen.getByLabelText(/Capacidad/).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('entero mayor que cero');
    expect(apiClient.put).not.toHaveBeenCalled();
  });
  it('rechaza un nombre que solo contiene espacios', () => {
    render(<EspacioFormModal espacio={espacio} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre del espacio/), { target: { value: '   ' } });
    fireEvent.submit(screen.getByLabelText(/Capacidad/).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('nombre del espacio es obligatorio');
    expect(apiClient.put).not.toHaveBeenCalled();
  });
  it('bloquea envíos duplicados y cierre mientras guarda y recupera el formulario tras un error', async () => {
    let rechazar!: (error: Error) => void;
    vi.mocked(apiClient.put).mockImplementationOnce(() => new Promise((_resolve, reject) => { rechazar = reject; }));
    const cerrar = vi.fn();
    render(<EspacioFormModal espacio={espacio} onClose={cerrar} onSaved={vi.fn()} />);
    const form = screen.getByLabelText(/Capacidad/).closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(apiClient.put).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await userEvent.keyboard('{Escape}'); expect(cerrar).not.toHaveBeenCalled();
    await act(async () => rechazar(new Error('red')));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el espacio');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(2));
  });
});
