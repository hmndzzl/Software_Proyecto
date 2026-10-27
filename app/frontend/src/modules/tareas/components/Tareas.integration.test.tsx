import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TareasPage from '../../../pages/tasks/TareasPage';
import { ToastProvider } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import apiClient from '../../../api/client';
import { ROLES } from '../../../utils/roles';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
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
    data: url === '/api/personas' ? personas : url === '/api/eventos' || url.endsWith('/disponibilidad/periodos') ? [] : tareas,
  }));
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
}

function mostrar(rol: number = ROLES.ADMIN) {
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'a@a.com', rol_id: rol }));
  return render(<ToastProvider><TareasPage /></ToastProvider>);
}

async function abrirMinistros() {
  const boton = await screen.findByRole('button', { name: /opciones de ministros$/ });
  if (boton.getAttribute('aria-expanded') === 'false') await userEvent.click(boton);
}

async function completarCreacion(inicio = '14:00', fin = '15:00') {
  await userEvent.type(await screen.findByLabelText('Título:'), 'Nueva tarea');
  await userEvent.type(screen.getByLabelText('Descripción:'), 'Descripción de prueba');
  fireEvent.change(screen.getByLabelText('Fecha:'), { target: { value: '2099-11-01' } });
  fireEvent.change(screen.getByLabelText('Hora de Inicio:'), { target: { value: inicio } });
  fireEvent.change(screen.getByLabelText('Hora de Fin:'), { target: { value: fin } });
  await abrirMinistros();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Luis Ministro' }));
}

describe('integración de tareas, asignaciones y permisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepararApi();
  });

  it('busca entre 40 ministros sin perder las selecciones ocultas por el filtro', async () => {
    const muchos = Array.from({ length: 40 }, (_, i) => ({ id: 100 + i, nombre: `Ministro ${String(i + 1).padStart(2, '0')}`, disponible: true }));
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? muchos : [] }));
    mostrar();
    const buscar = await screen.findByLabelText('Buscar ministro');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await userEvent.click(buscar);
    expect(screen.getAllByRole('checkbox')).toHaveLength(40);
    await userEvent.type(buscar, 'ministro 40');
    await abrirMinistros();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ministro 40' }));
    await userEvent.clear(buscar);
    await userEvent.type(buscar, 'ministro 01');
    await abrirMinistros();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ministro 01' }));
    expect(screen.getByText('2 ministros seleccionados.')).toBeInTheDocument();
    await userEvent.clear(buscar);
    await abrirMinistros();
    expect(screen.getByRole('checkbox', { name: 'Ministro 40' })).toBeChecked();
    await abrirMinistros();
    expect(screen.getByRole('checkbox', { name: 'Ministro 01' })).toBeChecked();
    await userEvent.type(buscar, 'inexistente');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('No hay ministros que coincidan con la búsqueda.')).toBeInTheDocument();
  });

  it('crea una tarea, limpia el formulario y refresca las asignaciones', async () => {
    mostrar();
    await completarCreacion();
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/api/tareas', {
      titulo: 'Nueva tarea', descripcion: 'Descripción de prueba', fecha: '2099-11-01',
      hora_inicio: '14:00', hora_fin: '15:00', persona_ids: [10], evento_id: null,
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tarea creada');
    expect(screen.getByLabelText('Título:')).toHaveValue('');
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/tareas', { params: undefined }));
  });

  it('sugiere el horario del evento y guarda una tarea de preparación con horario propio', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/eventos'
      ? [{ id: 20, titulo: 'Misa dominical', fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00', estado_reserva_id: 2 }]
      : url === '/api/personas' ? personas : tareas }));
    mostrar();
    await screen.findByRole('option', { name: /Misa dominical/ });
    await userEvent.selectOptions(screen.getByLabelText('Misa o evento asociado (opcional)'), '20');
    expect(screen.getByLabelText('Fecha:')).toHaveValue('2099-11-01');
    expect(screen.getByLabelText('Hora de Inicio:')).toHaveValue('10:00');
    await userEvent.type(screen.getByLabelText('Título:'), 'Preparar altar');
    await userEvent.type(screen.getByLabelText('Descripción:'), 'Preparación');
    fireEvent.change(screen.getByLabelText('Hora de Inicio:'), { target: { value: '09:30' } });
    fireEvent.change(screen.getByLabelText('Hora de Fin:'), { target: { value: '10:00' } });
    await abrirMinistros();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Luis Ministro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/api/tareas', expect.objectContaining({ evento_id: 20, hora_inicio: '09:30', hora_fin: '10:00' })));
  });

  it('valida campos y horario antes de crear', async () => {
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Crear y asignar tarea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Faltan datos');
    await completarCreacion('16:00', '15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Horario inválido');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('conserva los datos y muestra el error específico o de red al crear', async () => {
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce({ response: { data: { mensaje: 'Título duplicado' } } })
      .mockRejectedValueOnce(new Error('sin red'));
    mostrar();
    await completarCreacion();
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Título duplicado');
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de red');
  });

  it('asigna una tarea y advierte conflicto, indisponibilidad y exceso de rotación', async () => {
    mostrar();
    await completarCreacion();
    fireEvent.change(screen.getByLabelText('Fecha:'), { target: { value: '2099-10-20' } });
    await abrirMinistros();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ana Ministra' }));

    expect(screen.getByText(/Conflicto de horario/)).toBeInTheDocument();
    expect(screen.getByText(/no disponible/)).toBeInTheDocument();
    expect(screen.getByText(/tope: 8/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('valida y reporta errores al asignar', async () => {
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Crear y asignar tarea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('selecciona al menos un ministro');

    await userEvent.selectOptions(screen.getByLabelText('Tarea'), '1');
    await abrirMinistros();
    expect(screen.getByRole('checkbox', { name: 'Ana Ministra (ya asignado)' })).toBeDisabled();
    await abrirMinistros();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Luis Ministro' }));
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { data: { mensaje: 'Ya está asignado' } } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Asignación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya está asignado');
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

  it('asocia y enfoca los cinco campos de edición sin confundirlos con la creación', async () => {
    mostrar();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]);
    const modal = screen.getByRole('dialog', { name: 'Editar Tarea #1' });
    for (const nombre of ['Título:', 'Descripción:', 'Fecha:', 'Hora de Inicio:', 'Hora de Fin:']) {
      const control = within(modal).getByLabelText(nombre);
      expect(control).toBeRequired();
      await userEvent.click(within(modal).getByText(nombre, { exact: true }));
      expect(control).toHaveFocus();
      expect(screen.getAllByLabelText(nombre, { exact: true })).toHaveLength(2);
    }
    const ids = Array.from(document.querySelectorAll('[id]'), element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('muestra error de carga y permite reintentar', async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => url === '/api/tareas'
      ? Promise.reject(new Error('red'))
      : Promise.resolve({ data: personas }));
    mostrar();
    expect(await screen.findByText('Error al obtener los datos')).toBeInTheDocument();
    prepararApi();
    for (const boton of screen.getAllByRole('button', { name: /reintentar/i })) await userEvent.click(boton);
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

  it('valida el horario y conserva el modal cuando falla la edición', async () => {
    mostrar();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]);
    const modal = screen.getByRole('dialog', { name: 'Editar Tarea #1' });
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

  it('crea una tarea y asigna varios ministros con una sola petición', async () => {
    mostrar(ROLES.COORDINADOR_MINISTROS);
    await completarCreacion();
    await abrirMinistros();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ana Ministra' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/api/tareas', expect.objectContaining({ persona_ids: [10, 9] })));
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Tarea creada y asignada');
  });

  it('agrega ministros a una tarea existente en el mismo formulario', async () => {
    mostrar();
    await userEvent.selectOptions(await screen.findByLabelText('Tarea'), '1');
    await abrirMinistros();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Luis Ministro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Asignación' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/api/tareas/asignar', { tarea_id: 1, persona_ids: [10] }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tarea asignada');
  });

  it('permite desmarcar y exige seleccionar al menos un ministro', async () => {
    mostrar();
    await completarCreacion();
    await abrirMinistros();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Luis Ministro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('al menos un ministro');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('bloquea el formulario mientras guarda y conserva los datos si falla', async () => {
    let rechazar!: (error: Error) => void;
    vi.mocked(apiClient.post).mockImplementationOnce(() => new Promise((_resolve, reject) => { rechazar = reject; }));
    mostrar();
    await completarCreacion();
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
    expect(screen.getByLabelText('Título:')).toBeDisabled();
    rechazar(new Error('sin red'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de red');
    expect(screen.getByLabelText('Título:')).toHaveValue('Nueva tarea');
    await abrirMinistros();
    expect(screen.getByRole('checkbox', { name: 'Luis Ministro' })).toBeChecked();
  });

  it('no ofrece guardar cuando no hay ministros en el directorio', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    mostrar();
    expect(await screen.findByText('No hay ministros disponibles en tu directorio para asignar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear y asignar tarea' })).toBeDisabled();
  });

  it('oculta las acciones a los roles que no gestionan ministros', async () => {
    mostrar(ROLES.COORDINADOR_GRUPOS);
    await screen.findByRole('cell', { name: 'Lectura dominical' });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar tarea' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar ministro de esta tarea' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Cambiar responsable')).not.toBeInTheDocument();
  });
});


describe('avisos de ausencia por fecha y hora', () => {
  beforeEach(() => { vi.clearAllMocks(); prepararApi(); });
  it('advierte antes y después de guardar sin bloquear y respeta el fin del periodo', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? personas : url.endsWith('/disponibilidad/periodos')
      ? [{ id: 1, desde: '2099-11-01T14:00', hasta: '2099-11-01T15:00', origen: 'disponibilidad' },
         { id: 2, desde: '2099-11-01T00:00', hasta: '2099-11-02T00:00', origen: 'ausencia' }]
      : url === '/api/eventos' ? [] : tareas }));
    vi.mocked(apiClient.post).mockResolvedValue({ data: { alertas: [{ persona_id: 10, ministro_no_disponible: true, ausencia_reportada: true }] } });
    mostrar(); await completarCreacion();
    await screen.findByText('Tiene un periodo no disponible en este horario.');
    expect(screen.getByText('Tiene una ausencia reportada en esta fecha.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hora de Inicio:'), { target: { value: '15:00' } });
    fireEvent.change(screen.getByLabelText('Hora de Fin:'), { target: { value: '16:00' } });
    expect(screen.queryByText('Tiene un periodo no disponible en este horario.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tiene una ausencia reportada en la fecha de la tarea.');
  });
  it('avisa si no puede comprobar periodos y conserva la comprobación del servidor', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => {
      if (url.endsWith('/disponibilidad/periodos')) throw new Error('red');
      return { data: url === '/api/personas' ? personas : url === '/api/eventos' ? [] : tareas };
    });
    mostrar(); await completarCreacion();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron consultar los periodos.');
    await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
  });
});

it('muestra la advertencia definitiva de periodo y tope devuelta por el servidor', async () => {
  vi.clearAllMocks(); prepararApi();
  vi.mocked(apiClient.post).mockResolvedValue({ data: { alertas: [
    { persona_id: 10, ministro_no_disponible: true, periodo_no_disponible: true, tope_servicios_superado: true, servicios_en_el_mes: 9, tope_servicios_mes: 8 },
    { persona_id: 999, ministro_no_disponible: true }
  ] } });
  mostrar(); await completarCreacion();
  await userEvent.click(screen.getByRole('button', { name: 'Crear y asignar tarea' }));
  const aviso = await screen.findByRole('status');
  expect(aviso).toHaveTextContent('Tiene un periodo no disponible que coincide con el horario de la tarea.');
  expect(aviso).toHaveTextContent('supera el tope mensual (9/8)');
  expect(aviso).toHaveTextContent('Ministro: Está marcado como no disponible.');
});
