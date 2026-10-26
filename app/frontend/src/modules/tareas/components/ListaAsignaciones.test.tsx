import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListaAsignaciones from './ListaAsignaciones';
import { Card } from '../../../components/ui/Card';
import { ToastProvider } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import apiClient from '../../../api/client';
import type { Tarea } from '../../../types';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));
const personas = ['Ana', 'Luis', 'Marta', 'Pedro', 'Rosa', 'José'].map((nombre, index) => ({ id: index + 9, nombre, disponible: true }));
let registros: Tarea[];
const mostrar = (rol = 5) => {
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 7, nombre: 'Usuario', correo: 'u@test.com', rol_id: rol }));
  return render(<ToastProvider><Card><ListaAsignaciones /></Card></ToastProvider>);
};
const fila = () => screen.getByRole('cell', { name: 'Lectura dominical' }).closest('tr')!;
const gestionar = async () => {
  await screen.findByRole('cell', { name: 'Lectura dominical' });
  await userEvent.click(within(fila()).getByRole('button', { name: 'Gestionar ministros' }));
  return screen.getByRole('dialog');
};

beforeEach(() => {
  vi.resetAllMocks();
  registros = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, titulo: index ? `Servicio ${String(index + 1).padStart(2, '0')}` : 'Lectura dominical',
    descripcion: 'Preparar la celebración', fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00',
    asignados: index ? [] : personas.slice(0, 5).map(p => ({ persona_id: p.id, nombre: p.nombre })) }));
  vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? personas : url === '/api/eventos' ? [] : registros }));
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
});

describe('tareas agrupadas y tarjeta de asignación', () => {
  it('muestra una fila por tarea, dos nombres y diez tareas por página', async () => {
    mostrar();
    await screen.findByRole('cell', { name: 'Lectura dominical' });
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('Ana, Luis')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver los 5 ministros de Lectura dominical' })).toHaveTextContent('5 ministros');
    expect(screen.getByText('Mostrando 12 de 12 registros.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('Página 2 de 2 · 12 tareas')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Buscar'), 'Lectura');
    expect(screen.getByRole('cell', { name: 'Lectura dominical' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('filtra por cualquier ministro y mantiene el ordenamiento y las tareas sin asignación', async () => {
    mostrar();
    await screen.findByRole('cell', { name: 'Lectura dominical' });
    await userEvent.selectOptions(screen.getByLabelText('Ministro'), 'Marta');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('Mostrando 1 de 12 registros.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    for (const label of ['Tarea', 'Ministros asignados', 'Fecha', 'Horario']) {
      await userEvent.click(screen.getByRole('columnheader', { name: new RegExp(label) }));
    }
    await userEvent.selectOptions(screen.getByLabelText('Asignación'), 'Sin ministro');
    expect(screen.queryByRole('cell', { name: 'Lectura dominical' })).not.toBeInTheDocument();
  });

  it('abre la tarjeta desde la fila o el teclado y restaura el foco al cerrar', async () => {
    mostrar();
    const boton = await screen.findByRole('button', { name: 'Lectura dominical' });
    fireEvent.click(fila());
    const modal = screen.getByRole('dialog', { name: 'Lectura dominical' });
    expect(modal).toHaveTextContent('Preparar la celebración');
    expect(within(modal).getByText('Ministros asignados (5)')).toBeInTheDocument();
    for (const persona of personas.slice(0, 5)) expect(within(modal).getByText(persona.nombre)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(boton).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('permite buscar entre cien ministros asignados dentro de la tarjeta', async () => {
    registros[0].asignados = Array.from({ length: 100 }, (_, i) => ({ persona_id: i + 100, nombre: `Ministro ${i + 1}` }));
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Lectura dominical' }));
    const modal = screen.getByRole('dialog');
    const lista = within(modal).getByRole('list', { name: 'Ministros de la tarea' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(100);
    await userEvent.type(within(modal).getByLabelText('Buscar ministro asignado'), 'ministro 100');
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1);
    expect(within(lista).getByText('Ministro 100')).toBeInTheDocument();
    await userEvent.clear(within(modal).getByLabelText('Buscar ministro asignado'));
    await userEvent.type(within(modal).getByLabelText('Buscar ministro asignado'), 'inexistente');
    expect(within(modal).getByRole('status')).toHaveTextContent('No hay ministros asignados que coincidan');
  });

  it('agrega ministros desde la tarjeta sin volver a asignar los existentes', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { alertas: [{ persona_id: 14,
      ministro_no_disponible: true, tope_servicios_superado: true, servicios_en_el_mes: 9, tope_servicios_mes: 8 }] } });
    mostrar();
    const modal = await gestionar();
    await userEvent.click(within(modal).getByLabelText('Buscar ministro'));
    expect(within(modal).getByRole('checkbox', { name: 'Ana (ya asignado)' })).toBeDisabled();
    await userEvent.click(within(modal).getByRole('checkbox', { name: 'José' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Agregar seleccionados' }));
    expect(apiClient.post).toHaveBeenCalledWith('/api/tareas/asignar', { tarea_id: 1, persona_ids: [14] });
    expect(await screen.findByRole('status')).toHaveTextContent('Ministros agregados');
    expect(screen.getByRole('status')).toHaveTextContent('José está marcado como no disponible.');
    expect(screen.getByRole('status')).toHaveTextContent('9 servicios');
  });

  it('conserva los ministros elegidos si falla la asignación y permite reintentar', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { data: { mensaje: 'Conflicto de horario' } } });
    mostrar();
    const modal = await gestionar();
    await userEvent.click(within(modal).getByLabelText('Buscar ministro'));
    await userEvent.click(within(modal).getByRole('checkbox', { name: 'José' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Agregar seleccionados' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de horario');
    await userEvent.click(within(modal).getByLabelText('Buscar ministro'));
    expect(within(modal).getByRole('checkbox', { name: 'José' })).toBeChecked();
    await userEvent.click(within(modal).getByRole('button', { name: 'Agregar seleccionados' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Ministros agregados');
  });

  it('solo permite reemplazar y quitar ministros propios en una tarea compartida', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? personas.slice(0, 1) : registros }));
    mostrar(2);
    const modal = await gestionar();
    expect(within(modal).getByRole('button', { name: 'Quitar a Ana' })).toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: 'Quitar a Luis' })).not.toBeInTheDocument();
    await userEvent.click(within(modal).getByTitle('Cambiar responsable'));
    expect(within(modal).getAllByRole('option').map(option => option.textContent)).toEqual(['Ana']);
  });

  it('reasigna con alertas y conserva la tarjeta cuando el servidor rechaza un cambio', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { alerta: { tope_servicios_superado: true, servicios_en_el_mes: 9, tope_servicios_mes: 8 } } })
      .mockRejectedValueOnce({ response: { data: { mensaje: 'Ministro incompatible' } } });
    mostrar();
    const modal = await gestionar();
    await userEvent.click(within(modal).getAllByTitle('Cambiar responsable')[0]);
    await userEvent.selectOptions(within(modal).getByLabelText('Responsable de Lectura dominical'), '14');
    expect(apiClient.put).toHaveBeenCalledWith('/api/tareas/asignar', { tarea_id: 1, persona_actual_id: 9, persona_nueva_id: 14 });
    expect(await screen.findByRole('status')).toHaveTextContent('9 servicios');
    await userEvent.click(within(modal).getAllByTitle('Cambiar responsable')[0]);
    await userEvent.selectOptions(within(modal).getByLabelText('Responsable de Lectura dominical'), '14');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ministro incompatible');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('confirma el retiro individual y conserva los demás ministros y la tarea', async () => {
    vi.mocked(apiClient.delete).mockImplementationOnce(async () => { registros[0].asignados = registros[0].asignados.filter(a => a.persona_id !== 9); return { data: {} }; });
    mostrar();
    const modal = await gestionar();
    await userEvent.click(within(modal).getByRole('button', { name: 'Quitar a Ana' }));
    expect(modal).toHaveTextContent('La tarea y los demás ministros se conservarán');
    await userEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    expect(apiClient.delete).not.toHaveBeenCalled();
    await userEvent.click(within(modal).getByRole('button', { name: 'Quitar a Ana' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Quitar ministro' }));
    expect(apiClient.delete).toHaveBeenCalledWith('/api/tareas/asignar', { data: { tarea_id: 1, persona_id: 9 } });
    await waitFor(() => expect(within(modal).queryByRole('button', { name: 'Quitar a Ana' })).not.toBeInTheDocument());
    expect(registros[0].asignados).toHaveLength(4);
    expect(screen.getByRole('cell', { name: 'Lectura dominical' })).toBeInTheDocument();
  });

  it('confirma la eliminación completa y conserva la tarjeta ante un error', async () => {
    vi.mocked(apiClient.delete).mockRejectedValueOnce({ response: { data: { mensaje: 'No se pudo eliminar' } } });
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Lectura dominical' }));
    const modal = screen.getByRole('dialog');
    await userEvent.click(within(modal).getByRole('button', { name: 'Eliminar tarea' }));
    expect(modal).toHaveTextContent('Se borrarán todas sus asignaciones');
    expect(apiClient.delete).not.toHaveBeenCalled();
    await userEvent.click(within(modal).getByRole('button', { name: 'Eliminar tarea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo eliminar');
    vi.mocked(apiClient.delete).mockImplementationOnce(async () => { registros = registros.slice(1); return { data: {} }; });
    await userEvent.click(within(modal).getByRole('button', { name: 'Eliminar tarea' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(apiClient.delete).toHaveBeenLastCalledWith('/api/tareas/1');
  });

  it('conserva tareas sin ministros y permite consultar detalles sin permisos administrativos', async () => {
    registros = [{ ...registros[0], asignados: [] }];
    const admin = mostrar();
    expect(await screen.findByRole('cell', { name: 'Sin ministro asignado' })).toBeInTheDocument();
    admin.unmount(); mostrar(4);
    await userEvent.click(await screen.findByRole('button', { name: 'Lectura dominical' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Sin ministro asignado');
    expect(screen.queryByRole('button', { name: 'Gestionar ministros' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar tarea' })).not.toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/api/tareas', { params: { persona_id: 7 } });
  });

  it('permite reintentar errores de directorio sin ofrecer ministros ajenos', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => {
      if (url === '/api/personas') throw new Error('red');
      return { data: registros };
    });
    mostrar(2);
    const modal = await gestionar();
    expect(within(modal).getByText('No se pudo cargar tu directorio de ministros.')).toBeInTheDocument();
    expect(within(modal).queryByRole('checkbox')).not.toBeInTheDocument();
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? personas : registros }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Reintentar' }));
    expect(await within(modal).findByLabelText('Buscar ministro')).toBeInTheDocument();
  });
});
