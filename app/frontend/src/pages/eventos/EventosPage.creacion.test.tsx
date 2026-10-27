import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import EventosPage from './EventosPage';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { authValue } from '../../test/authValue';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
const datos = { fecha: '2099-12-12', hora_inicio: '09:00', hora_fin: '10:00', espacio_id: 2,
  titulo: 'Encuentro parroquial', descripcion: 'Actividad de la comunidad', cantidad_personas: 30, publico: false };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'a@test.com', rol_id: 5 }));
  vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/espacios'
    ? [{ id: 2, nombre: 'Salón', capacidad: 80 }] : [] }));
  vi.mocked(apiClient.post).mockResolvedValue({ data: { reservaId: 30 } });
});
function mostrar() {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ToastProvider><EventosPage /></ToastProvider></MemoryRouter>);
}
async function abrirYLlenar() {
  await userEvent.click(screen.getByRole('button', { name: 'Nuevo evento' }));
  const modal = screen.getByRole('dialog', { name: 'Crear evento' });
  await within(modal).findByRole('option', { name: /Salón/ });
  for (const [label, value] of [
    ['Espacio:', '2'], ['Fecha:', datos.fecha], ['Hora de Inicio:', datos.hora_inicio], ['Hora de Fin:', datos.hora_fin],
    ['Título del Evento:', datos.titulo], ['Descripción del Evento:', datos.descripcion],
  ]) fireEvent.change(within(modal).getByLabelText(label), { target: { value } });
  fireEvent.change(within(modal).getByLabelText(/Cantidad de personas esperadas/), { target: { value: '30' } });
  return modal;
}
it.each([1, 5])('el rol %s crea evento y reserva, cierra el modal y refresca el listado', async rol_id => {
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Gestor', correo: 'g@test.com', rol_id }));
  mostrar();
  const modal = await abrirYLlenar();
  await userEvent.click(within(modal).getByRole('button', { name: 'Crear evento' }));
  expect(apiClient.post).toHaveBeenCalledWith('/api/reservas', datos);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByRole('status')).toHaveTextContent('Evento creado');
  expect(screen.getByRole('status')).toHaveTextContent('Puedes aprobar la reserva desde la pantalla Reservas.');
  expect(vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/api/eventos')).toHaveLength(2);
});
it.each([2, 3, 4])('el rol %s conserva la consulta sin ofrecer creación', async rol_id => {
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 7, nombre: 'Consulta', correo: 'c@test.com', rol_id }));
  mostrar();
  await screen.findByText('No hay eventos registrados.');
  expect(screen.queryByRole('button', { name: 'Nuevo evento' })).not.toBeInTheDocument();
});
it('cancelar conserva el listado sin enviar peticiones', async () => {
  mostrar();
  const modal = await abrirYLlenar();
  await userEvent.click(within(modal).getByRole('button', { name: 'Cerrar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled();
});
it('conserva los campos y muestra el motivo cuando falla crear', async () => {
  vi.mocked(apiClient.post).mockRejectedValue({ response: { data: { message: 'El espacio ya está reservado' } } });
  mostrar();
  const modal = await abrirYLlenar();
  await userEvent.click(within(modal).getByRole('button', { name: 'Crear evento' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo crear el eventoEl espacio ya está reservado');
  expect(within(modal).getByLabelText('Título del Evento:')).toHaveValue(datos.titulo);
});
it('bloquea envíos y cierres mientras se guarda', async () => {
  let resolver!: (value: object) => void;
  vi.mocked(apiClient.post).mockImplementation(() => new Promise(resolve => { resolver = resolve; }));
  mostrar();
  const modal = await abrirYLlenar();
  await userEvent.click(within(modal).getByRole('button', { name: 'Crear evento' }));
  expect(within(modal).getByRole('button', { name: 'Enviando...' })).toBeDisabled();
  expect(within(modal).getByRole('button', { name: 'Cerrar' })).toBeDisabled();
  await userEvent.keyboard('{Escape}');
  expect(modal).toBeVisible();
  fireEvent.submit(within(modal).getByRole('button', { name: 'Enviando...' }).closest('form')!);
  expect(apiClient.post).toHaveBeenCalledOnce();
  await act(async () => resolver({ data: { reservaId: 30 } }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
