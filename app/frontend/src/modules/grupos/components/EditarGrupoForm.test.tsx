import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import EditarGrupoForm from './EditarGrupoForm';
import apiClient from '../../../api/client';
import { ToastProvider } from '../../../context/ToastContext';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
const grupo = { id: 3, nombre: 'Coro', coordinadores: [{ id: 7, nombre: 'Ana' }] };
const personas = [{ id: 7, nombre: 'Ana' }, { id: 8, nombre: 'Luis' }];
const mostrar = () => render(<EditarGrupoForm grupo={grupo} />, { wrapper: ToastProvider });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({ data: personas });
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
});

it('recupera una carga fallida sin perder el nombre ni los coordinadores del grupo', async () => {
  vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red'));
  mostrar();
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Guardar Cambios' })).toBeDisabled();
  await userEvent.clear(screen.getByLabelText('Nombre del Grupo:'));
  await userEvent.type(screen.getByLabelText('Nombre del Grupo:'), ' Coro juvenil ');
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('checkbox', { name: 'Ana' })).toBeChecked();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Luis' }));
  await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Grupo actualizado');
  expect(apiClient.put).toHaveBeenCalledWith('/api/grupos/3', { nombre: 'Coro juvenil', coordinador_ids: [7, 8] });
});

it('impide guardar antes de terminar la carga de coordinadores', async () => {
  let terminar!: (value: unknown) => void;
  vi.mocked(apiClient.get).mockImplementation(() => new Promise(resolve => { terminar = resolve; }));
  mostrar();
  const boton = screen.getByRole('button', { name: 'Guardar Cambios' });
  expect(boton).toBeDisabled();
  fireEvent.submit(boton.closest('form')!);
  expect(apiClient.put).not.toHaveBeenCalled();
  await act(async () => terminar({ data: personas }));
  expect(boton).toBeEnabled();
});

it('evita guardar un grupo sin coordinadores seleccionados', async () => {
  mostrar();
  await userEvent.click(await screen.findByRole('checkbox', { name: 'Ana' }));
  await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Faltan datos');
  expect(apiClient.put).not.toHaveBeenCalled();
});

it('bloquea envíos repetidos y permite corregir o reintentar después de un fallo al guardar', async () => {
  let fallar!: (error: Error) => void;
  vi.mocked(apiClient.put).mockImplementation(() => new Promise((_, reject) => { fallar = reject; }));
  mostrar();
  await screen.findByRole('checkbox', { name: 'Ana' });
  const nombre = screen.getByLabelText('Nombre del Grupo:');
  await userEvent.clear(nombre);
  await userEvent.type(nombre, 'Coro juvenil');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
  expect(nombre).toBeDisabled();
  fireEvent.submit(nombre.closest('form')!);
  expect(apiClient.put).toHaveBeenCalledTimes(1);
  await act(async () => fallar(new Error('red')));
  expect(await screen.findByRole('alert')).toHaveTextContent('Error de red al intentar actualizar el grupo.');
  expect(nombre).toBeEnabled();
  expect(nombre).toHaveValue('Coro juvenil');
  expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeChecked();
});
