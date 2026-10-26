import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import { ToastProvider } from '../../context/ToastContext';
import CoordinadoresMinistrosPage from './CoordinadoresMinistrosPage';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const base = '/api/coordinadores-ministros';
const ana = { id: 9, nombre: 'Ana', correo: 'ana@test.com', estado_cuenta: 'activa' };
const bea = { id: 10, nombre: 'Bea', correo: 'bea@test.com', estado_cuenta: 'activa' };
let asignados: typeof ana[];
function mostrar() { return render(<MemoryRouter><ToastProvider><CoordinadoresMinistrosPage /></ToastProvider></MemoryRouter>); }
async function elegirCoordinador(id = '7') {
  await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Coordinador de ministros' }), id);
  await screen.findByRole('table');
}

beforeEach(() => {
  vi.resetAllMocks();
  asignados = [ana];
  vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === base
    ? [{ id: 7, nombre: 'Coordinador Norte', estado_cuenta: 'activa' }, { id: 13, nombre: 'Coordinador Sur', estado_cuenta: 'rechazada' }]
    : url === '/api/personas' ? [ana, bea] : asignados }));
  vi.mocked(apiClient.put).mockImplementation(async () => { asignados = [ana, bea]; return { data: {} }; });
  vi.mocked(apiClient.delete).mockImplementation(async () => { asignados = []; return { data: {} }; });
});

describe('gestión visual de coordinadores', () => {
  it('lista los asignados y agrega sin ofrecer duplicados', async () => {
    mostrar();
    await elegirCoordinador();
    const selector = screen.getByRole('combobox', { name: 'Ministro para asignar' });
    expect(within(selector).queryByRole('option', { name: /Ana/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(selector, '10');
    await userEvent.click(screen.getByRole('button', { name: 'Asignar ministro' }));
    expect(apiClient.put).toHaveBeenCalledWith(`${base}/7/ministros/10`);
    await waitFor(() => expect(screen.getByRole('table')).toHaveTextContent('Bea'));
    expect(screen.getByText('No hay ministros activos disponibles para agregar a este coordinador.')).toBeInTheDocument();
  });
  it('confirma antes de retirar y permite cancelar', async () => {
    mostrar();
    await elegirCoordinador();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar a Ana' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(apiClient.delete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar a Ana' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
    expect(apiClient.delete).toHaveBeenCalledWith(`${base}/7/ministros/9`);
    expect(await screen.findByText('Este coordinador todavía no tiene ministros asignados.')).toBeInTheDocument();
  });
  it('no anuncia éxito ni cambia la lista si falla asignar', async () => {
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { mensaje: 'La cuenta ya no está activa' } } });
    mostrar();
    await elegirCoordinador();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ministro para asignar' }), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Asignar ministro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La cuenta ya no está activa');
    expect(screen.getByRole('table')).not.toHaveTextContent('Bea');
  });
  it('conserva la relación y permite reintentar un retiro fallido', async () => {
    vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('red'));
    mostrar();
    await elegirCoordinador();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar a Ana' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo quitar el ministro');
    expect(screen.getByRole('table')).toHaveTextContent('Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
    expect(await screen.findByText('Este coordinador todavía no tiene ministros asignados.')).toBeInTheDocument();
  });
  it('solo permite retirar relaciones de un coordinador no activo', async () => {
    mostrar();
    await elegirCoordinador('13');
    expect(screen.queryByRole('button', { name: 'Asignar ministro' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar a Ana' })).toBeEnabled();
  });
  it('permite reintentar errores de carga inicial', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red'));
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: /reintentar/i }));
    expect(await screen.findByRole('combobox', { name: 'Coordinador de ministros' })).toBeInTheDocument();
  });
  it('permite reintentar errores de lectura de las asignaciones', async () => {
    mostrar();
    const selector = await screen.findByRole('combobox', { name: 'Coordinador de ministros' });
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red'));
    await userEvent.selectOptions(selector, '7');
    await userEvent.click(await screen.findByRole('button', { name: /reintentar/i }));
    expect(await screen.findByRole('table')).toHaveTextContent('Ana');
  });
  it('muestra un estado vacío cuando no existen coordinadores', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    mostrar();
    expect(await screen.findByText('No hay coordinadores de ministros registrados.')).toBeInTheDocument();
  });
  it('bloquea cambios de coordinador y nuevos envíos durante una asignación', async () => {
    let finalizar!: () => void;
    vi.mocked(apiClient.put).mockImplementationOnce(() => new Promise(resolve => { finalizar = () => resolve({ data: {} }); }));
    mostrar();
    await elegirCoordinador();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ministro para asignar' }), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Asignar ministro' }));
    expect(screen.getByRole('combobox', { name: 'Coordinador de ministros' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Asignando…' })).toBeDisabled();
    finalizar();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Coordinador de ministros' })).toBeEnabled());
    expect(apiClient.put).toHaveBeenCalledOnce();
  });
  it('descarta respuestas de un coordinador que ya no está seleccionado', async () => {
    mostrar();
    const selector = await screen.findByRole('combobox', { name: 'Coordinador de ministros' });
    let responderNorte!: () => void;
    vi.mocked(apiClient.get).mockImplementationOnce(() => new Promise(resolve => { responderNorte = () => resolve({ data: [bea] }); }));
    await userEvent.selectOptions(selector, '7');
    await userEvent.selectOptions(selector, '13');
    expect(await screen.findByRole('table')).toHaveTextContent('Ana');
    responderNorte();
    await waitFor(() => expect(screen.getByRole('table')).not.toHaveTextContent('Bea'));
  });
  it('navega de regreso a ministros al hacer clic en el botón del encabezado', async () => {
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Volver a ministros' }));
  });
});
