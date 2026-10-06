import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CrearGrupoForm from './CrearGrupoForm';
import apiClient from '../../../api/client';
import { ToastProvider } from '../../../context/ToastContext';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const mostrar = (props: Parameters<typeof CrearGrupoForm>[0] = {}) =>
  render(<CrearGrupoForm {...props} />, { wrapper: ToastProvider });

describe('CrearGrupoForm - avisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 7, nombre: 'Ana Coordinadora' }] });
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  });

  const llenar = async () => {
    await userEvent.type(screen.getByLabelText(/Nombre del Grupo/), 'Jóvenes');
    await userEvent.selectOptions(screen.getByRole('combobox'), '7');
  };

  it('avisa con un toast si no se pueden cargar los coordinadores', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('red'));
    mostrar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los datosError al cargar la lista de coordinadores.');
  });

  it('avisa con un toast cuando faltan datos', async () => {
    mostrar();
    await screen.findByText('Ana Coordinadora');

    await userEvent.click(screen.getByRole('button', { name: /crear grupo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Faltan datosPor favor completa todos los campos.');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('confirma con un toast que incluye el nombre del grupo y avisa al padre', async () => {
    const onGrupoCreado = vi.fn();
    mostrar({ onGrupoCreado });
    await screen.findByText('Ana Coordinadora');

    await llenar();
    await userEvent.click(screen.getByRole('button', { name: /crear grupo/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Grupo creadoEl grupo "Jóvenes" ya está disponible.');
    expect(onGrupoCreado).toHaveBeenCalled();
  });

  it('el aviso sigue visible aunque el formulario se desmonte (p. ej. se cierre su modal)', async () => {
    const { rerender } = mostrar();
    await screen.findByText('Ana Coordinadora');
    await llenar();
    await userEvent.click(screen.getByRole('button', { name: /crear grupo/i }));
    await screen.findByRole('status');

    rerender(<div>formulario cerrado</div>);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('usa un mensaje genérico si falla sin respuesta del servidor', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('red'));
    mostrar();
    await screen.findByText('Ana Coordinadora');

    await llenar();
    await userEvent.click(screen.getByRole('button', { name: /crear grupo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Error de red al intentar crear el grupo.');
  });

  it('muestra el mensaje del servidor si falla', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: { mensaje: 'Ya existe un grupo con ese nombre' } } });
    mostrar();
    await screen.findByText('Ana Coordinadora');

    await llenar();
    await userEvent.click(screen.getByRole('button', { name: /crear grupo/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo crear el grupo'));
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe un grupo con ese nombre');
  });
});
