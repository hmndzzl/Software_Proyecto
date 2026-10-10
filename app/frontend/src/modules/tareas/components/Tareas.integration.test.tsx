import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TareasPage from '../../../pages/tasks/TareasPage';
import { ToastProvider } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import apiClient from '../../../api/client';
import { ROLES } from '../../../utils/roles';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const personas = [
  { id: 9, nombre: 'Ana Ministra', disponible: false },
  { id: 10, nombre: 'Luis Ministro', disponible: true },
];

const tareas = Array.from({ length: 9 }, (_, indice) => ({
  id: indice + 1,
  titulo: indice === 0 ? 'Lectura dominical' : `Servicio ${indice + 1}`,
  descripcion: 'Preparar la celebración',
  fecha: indice < 2 ? '2099-10-20T00:00:00.000Z' : `2099-10-${String(20 + indice).padStart(2, '0')}T00:00:00.000Z`,
  hora_inicio: indice === 1 ? '14:30:00' : '14:00:00',
  hora_fin: indice === 1 ? '16:00:00' : '15:00:00',
  asignados: [{ persona_id: 9, nombre: 'Ana Ministra' }],
}));

function prepararApi() {
  vi.mocked(apiClient.get).mockImplementation(async (url) => ({
    data: url === '/api/personas' ? personas : tareas,
  }));
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
}

function mostrar(rol: number = ROLES.ADMIN) {
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'a@a.com', rol_id: rol }));
  return render(<ToastProvider><TareasPage /></ToastProvider>);
}

async function completarCreacion(inicio = '14:00', fin = '15:00') {
  await userEvent.type(screen.getByLabelText('Título:'), 'Nueva tarea');
  await userEvent.type(screen.getByLabelText('Descripción:'), 'Descripción de prueba');
  fireEvent.change(screen.getByLabelText('Fecha:'), { target: { value: '2099-11-01' } });
  fireEvent.change(screen.getByLabelText('Hora de Inicio:'), { target: { value: inicio } });
  fireEvent.change(screen.getByLabelText('Hora de Fin:'), { target: { value: fin } });
}

describe('integración de tareas, asignaciones y permisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepararApi();
  });

  it('crea una tarea, limpia el formulario y refresca las asignaciones', async () => {
    mostrar();
    await completarCreacion();
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tarea' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/api/tareas', {
      titulo: 'Nueva tarea', descripcion: 'Descripción de prueba', fecha: '2099-11-01',
      hora_inicio: '14:00', hora_fin: '15:00',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tarea creada');
    expect(screen.getByLabelText('Título:')).toHaveValue('');
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/tareas', { params: undefined }));
  });

  it('valida campos y horario antes de crear', async () => {
    mostrar();
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tarea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Faltan datos');
    await completarCreacion('16:00', '15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tarea' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Horario inválido');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('conserva los datos y muestra el error específico o de red al crear', async () => {
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce({ response: { data: { mensaje: 'Título duplicado' } } })
      .mockRejectedValueOnce(new Error('sin red'));
    mostrar();
    await completarCreacion();
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tarea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Título duplicado');
    await userEvent.click(screen.getByRole('button', { name: 'Crear Tarea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de red');
  });

  it('asigna una tarea y advierte conflicto, indisponibilidad y exceso de rotación', async () => {
    mostrar();
    await screen.findAllByText('Lectura dominical');
    const tarea = screen.getByLabelText('Seleccionar Tarea:');
    const persona = screen.getByLabelText('Seleccionar Ministro:');
    await userEvent.selectOptions(tarea, '1');
    await userEvent.selectOptions(persona, '9');

    expect(screen.getByText(/Conflicto de horario/)).toBeInTheDocument();
    expect(screen.getByText(/no disponible/)).toBeInTheDocument();
    expect(screen.getByText(/tope: 8/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Asignación' }));
    expect(apiClient.post).toHaveBeenCalledWith('/api/tareas/asignar', { tarea_id: 1, persona_id: 9 });
    expect(await screen.findByRole('status')).toHaveTextContent('Tarea asignada');
  });

  it('valida y reporta errores al asignar', async () => {
    mostrar();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Asignación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('selecciona una tarea');

    await userEvent.selectOptions(screen.getByLabelText('Seleccionar Tarea:'), '1');
    await userEvent.selectOptions(screen.getByLabelText('Seleccionar Ministro:'), '10');
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { data: { mensaje: 'Ya está asignado' } } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Asignación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya está asignado');
  });

  it('lista, ordena, reasigna y edita una asignación', async () => {
    vi.mocked(apiClient.put)
      .mockResolvedValueOnce({ data: { alerta: { ministro_no_disponible: true, tope_servicios_superado: true, servicios_en_el_mes: 9, tope_servicios_mes: 8 } } })
      .mockResolvedValue({ data: {} });
    mostrar();
    const fila = (await screen.findByRole('cell', { name: 'Lectura dominical' })).closest('tr')!;
    for (const label of ['Tarea', 'Ministro Asignado', 'Fecha', 'Horario']) {
      const header = screen.getByRole('columnheader', { name: new RegExp(label) });
      await userEvent.click(header);
      await userEvent.click(header);
    }
    await userEvent.click(within(fila).getByTitle('Cambiar responsable'));
    await userEvent.selectOptions(within(fila).getByRole('combobox'), '10');
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/tareas/asignar', {
      tarea_id: 1, persona_actual_id: 9, persona_nueva_id: 10,
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('9 servicios');

    const filaActualizada = (await screen.findByRole('cell', { name: 'Lectura dominical' })).closest('tr')!;
    await userEvent.click(within(filaActualizada).getByRole('button', { name: 'Editar' }));
    const modal = screen.getByText('Editar Tarea #1').parentElement!;
    const titulo = within(modal).getByDisplayValue('Lectura dominical');
    await userEvent.clear(titulo);
    await userEvent.type(titulo, 'Lectura actualizada');
    await userEvent.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/tareas/1', expect.objectContaining({ titulo: 'Lectura actualizada' })));
  });

  it('permite cancelar la edición y valida datos y horario', async () => {
    mostrar();
    const editar = (await screen.findAllByRole('button', { name: 'Editar' }))[0];
    await userEvent.click(editar);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Editar Tarea #1')).not.toBeInTheDocument();

    await userEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]);
    const titulo = screen.getByDisplayValue('Lectura dominical');
    await userEvent.clear(titulo);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Faltan datos');
  });

  it('muestra error de carga y permite reintentar', async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => url === '/api/tareas'
      ? Promise.reject(new Error('red'))
      : Promise.resolve({ data: personas }));
    mostrar();
    expect(await screen.findByText('Error al obtener los datos')).toBeInTheDocument();
    prepararApi();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findAllByText('Lectura dominical')).not.toHaveLength(0);
  });

  it('el ministro solo ve sus tareas y no ve formularios ni acciones administrativas', async () => {
    mostrar(ROLES.MINISTRO);
    expect(await screen.findByText('Mis Tareas')).toBeInTheDocument();
    expect(screen.queryByText('Crear Nueva Tarea')).not.toBeInTheDocument();
    expect(screen.queryByText('Ministro Asignado')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/api/tareas', { params: { persona_id: 1 } });
  });

  it('reasigna sin advertencias y recupera un error específico de reasignación', async () => {
    vi.mocked(apiClient.put)
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce({ response: { data: { mensaje: 'Ministro incompatible' } } });
    mostrar();
    let fila = (await screen.findByRole('cell', { name: 'Lectura dominical' })).closest('tr')!;
    await userEvent.click(within(fila).getByTitle('Cambiar responsable'));
    await userEvent.selectOptions(within(fila).getByRole('combobox'), '10');
    expect(await screen.findByRole('status')).toHaveTextContent('El cambio se guardó correctamente');

    fila = (await screen.findByRole('cell', { name: 'Lectura dominical' })).closest('tr')!;
    await userEvent.click(within(fila).getByTitle('Cambiar responsable'));
    await userEvent.selectOptions(within(fila).getByRole('combobox'), '10');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ministro incompatible');
  });

  it('valida el horario y conserva el modal cuando falla la edición', async () => {
    mostrar();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]);
    const modal = screen.getByText('Editar Tarea #1').parentElement!;
    const tiempos = Array.from(modal.querySelectorAll<HTMLInputElement>('input[type="time"]'));
    fireEvent.change(tiempos[0], { target: { value: '17:00' } });
    fireEvent.change(tiempos[1], { target: { value: '16:00' } });
    await userEvent.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Horario inválido');

    fireEvent.change(tiempos[0], { target: { value: '15:00' } });
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { mensaje: 'La fecha está cerrada' } } });
    await userEvent.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La fecha está cerrada');
    expect(screen.getByText('Editar Tarea #1')).toBeInTheDocument();
  });

  it('presenta estados vacíos distintos para administración y ministro', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? personas : [] }));
    const vista = mostrar();
    expect(await screen.findByText('No hay tareas asignadas en este momento.')).toBeInTheDocument();
    vista.unmount();
    mostrar(ROLES.MINISTRO);
    expect(await screen.findByText('No tienes tareas asignadas en este momento.')).toBeInTheDocument();
  });
});
