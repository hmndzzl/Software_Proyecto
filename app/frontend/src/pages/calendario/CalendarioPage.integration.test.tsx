import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { authValue } from '../../test/authValue';
import { ToastProvider } from '../../context/ToastContext';
import CalendarioPage from './CalendarioPage';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const tarea = { id: 1, fecha: '2026-10-05', hora_inicio: '09:30:00', hora_fin: '10:00:00', titulo: 'Preparar altar', descripcion: 'Preparación de la celebración', evento_id: 8, asignados: [{ persona_id: 9, nombre: 'Ana' }, { persona_id: 10, nombre: 'Luis' }] };
const independiente = { ...tarea, id: 2, titulo: 'Visitar enfermos', evento_id: null, asignados: [] };
const evento = { id: 8, reserva_id: 80, titulo: 'Misa del lunes', descripcion: 'Celebración parroquial', encargado_id: 1, nombre_encargado: 'Padre Pedro', fecha: '2026-10-05', hora_inicio: '10:00:00', hora_fin: '11:00:00', nombre_espacio: 'Templo', estado_reserva_id: 2, tareas: [tarea] };
const datos = { eventos: [evento], tareas: [tarea, independiente] };
const vacio = { eventos: [], tareas: [] };
const consultas = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/api/calendario');

function mostrar(rol = 5) {
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Usuario', correo: 'u@test.com', rol_id: rol }));
  return render(<ToastProvider><CalendarioPage /></ToastProvider>);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 7, 12));
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? [{ id: 9, nombre: 'Ana' }] : datos }));
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('calendario unificado semanal', () => {
  it('agrupa las tareas con su misa, muestra todo el equipo y conserva tareas independientes', async () => {
    mostrar();
    await screen.findByText('Misa del lunes');
    expect(consultas()[0][1]).toEqual({ params: { fecha_inicio: '2026-10-05', fecha_fin: '2026-10-11', vista: 'coordinacion' } });
    expect(screen.getAllByText('Preparar altar')).toHaveLength(1);
    expect(screen.getByText('Ana, Luis')).toBeInTheDocument();
    expect(screen.getByText('Visitar enfermos')).toBeInTheDocument();
    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
    expect(screen.getAllByText('Sin compromisos registrados')).toHaveLength(6);
  });

  it('aprueba una reserva pendiente ajena desde el detalle y refresca el calendario', async () => {
    const pendienteAjena = { ...evento, id: 20, reserva_id: 200, titulo: 'Asamblea de catequistas', estado_reserva_id: 1, encargado_id: 2 };
    vi.mocked(apiClient.get).mockImplementation(async url => ({
      data: url === '/api/personas' ? [] : { eventos: [pendienteAjena], tareas: [] },
    }));
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalle del evento Asamblea de catequistas/ }));
    const modal = screen.getByRole('dialog', { name: 'Asamblea de catequistas' });
    expect(within(modal).getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();

    await userEvent.click(within(modal).getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/200/estado', { estado_id: 2 }));
    expect(await screen.findByText('Reserva aprobada')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(consultas()).toHaveLength(2));
  });

  it('cancela (no rechaza) una reserva pendiente propia desde el detalle', async () => {
    const pendientePropia = { ...evento, id: 21, reserva_id: 201, titulo: 'Retiro de ministros', estado_reserva_id: 1, encargado_id: 1 };
    vi.mocked(apiClient.get).mockImplementation(async url => ({
      data: url === '/api/personas' ? [] : { eventos: [pendientePropia], tareas: [] },
    }));
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalle del evento Retiro de ministros/ }));
    const modal = screen.getByRole('dialog', { name: 'Retiro de ministros' });
    expect(within(modal).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();

    await userEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/201/estado', { estado_id: 4 }));
  });

  it('no muestra acciones de aprobación a un Ministro sobre una reserva pendiente', async () => {
    const pendienteAjena = { ...evento, id: 20, reserva_id: 200, titulo: 'Asamblea de catequistas', estado_reserva_id: 1, encargado_id: 2 };
    vi.mocked(apiClient.get).mockImplementation(async url => ({
      data: url === '/api/personas' ? [] : { eventos: [pendienteAjena], tareas: [] },
    }));
    mostrar(4);
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalle del evento Asamblea de catequistas/ }));
    const modal = screen.getByRole('dialog', { name: 'Asamblea de catequistas' });
    expect(within(modal).queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
  });

  it('muestra el error del servidor si la aprobación falla, sin cerrar el detalle', async () => {
    const pendienteAjena = { ...evento, id: 20, reserva_id: 200, titulo: 'Asamblea de catequistas', estado_reserva_id: 1, encargado_id: 2 };
    vi.mocked(apiClient.get).mockImplementation(async url => ({
      data: url === '/api/personas' ? [] : { eventos: [pendienteAjena], tareas: [] },
    }));
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { message: 'Conflicto de horario' } } });
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalle del evento Asamblea de catequistas/ }));
    const modal = screen.getByRole('dialog', { name: 'Asamblea de catequistas' });
    await userEvent.click(within(modal).getByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de horario');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('navega entre semanas, vuelve a hoy y conserva el ministro seleccionado', async () => {
    mostrar();
    await screen.findByText('Misa del lunes');
    await userEvent.selectOptions(screen.getByLabelText('Ver horario de un ministro'), '9');
    await waitFor(() => expect(consultas().slice(-1)[0]?.[1]).toEqual({ params: { fecha_inicio: '2026-10-05', fecha_fin: '2026-10-11', vista: 'coordinacion', persona_id: '9' } }));
    expect(screen.getByRole('status')).toHaveTextContent('Horario de Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Semana anterior' }));
    await waitFor(() => expect(consultas().slice(-1)[0]?.[1]).toEqual({ params: { fecha_inicio: '2026-09-28', fecha_fin: '2026-10-04', vista: 'coordinacion', persona_id: '9' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Semana siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByLabelText('Ver horario de un ministro')).toHaveValue('9');
  });

  it('muestra el detalle del evento y devuelve el foco al cerrarlo', async () => {
    mostrar();
    const tarjeta = await screen.findByRole('button', { name: /Ver detalle del evento/ });
    await userEvent.click(tarjeta);
    const modal = screen.getByRole('dialog', { name: 'Misa del lunes' });
    expect(within(modal).getByText('Ministros asignados: Ana, Luis')).toBeInTheDocument();
    expect(within(modal).getByText(/Horario de servicio: 9:30 a. m./)).toBeInTheDocument();
    expect(within(modal).getByText('Padre Pedro')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tarjeta).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: /Ver detalle de la tarea/ }));
    expect(screen.getByRole('dialog', { name: 'Visitar enfermos' })).toHaveTextContent('Sin asignar');
    await userEvent.click(screen.getByLabelText('Cerrar'));
  });

  it('muestra un error y permite reintentar sin indicar un calendario vacío', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => {
      if (url === '/api/calendario') throw new Error('sin red');
      return { data: [] };
    });
    mostrar();
    await screen.findByText(/No se pudo actualizar el calendario/);
    expect(screen.queryByText('Sin compromisos registrados')).not.toBeInTheDocument();
    vi.mocked(apiClient.get).mockResolvedValue({ data: vacio });
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    await waitFor(() => expect(screen.getAllByText('Sin compromisos registrados')).toHaveLength(7));
  });

  it('actualiza al recuperar foco y hace visible un fallo de actualización', async () => {
    mostrar();
    await screen.findByText('Misa del lunes');
    fireEvent.focus(window);
    await waitFor(() => expect(consultas()).toHaveLength(2));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    fireEvent(document, new Event('visibilitychange'));
    expect(consultas()).toHaveLength(2);
    vi.mocked(apiClient.get).mockRejectedValue(new Error('sin red'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    fireEvent(document, new Event('visibilitychange'));
    await screen.findByText(/No se pudo actualizar/);
    expect(screen.queryByText('Misa del lunes')).not.toBeInTheDocument();
  });

  it('ignora la respuesta de un filtro anterior', async () => {
    let resolver!: (value: { data: typeof datos }) => void;
    vi.mocked(apiClient.get).mockImplementation(url => url === '/api/personas'
      ? Promise.resolve({ data: [{ id: 9, nombre: 'Ana' }] })
      : new Promise(resolve => { resolver = resolve; }));
    mostrar();
    await waitFor(() => expect(screen.getByLabelText('Ver horario de un ministro')).not.toBeDisabled());
    const antigua = resolver;
    vi.mocked(apiClient.get).mockResolvedValue({ data: vacio });
    await userEvent.selectOptions(screen.getByLabelText('Ver horario de un ministro'), '9');
    await screen.findAllByText('Sin compromisos registrados');
    await act(async () => antigua({ data: datos }));
    expect(screen.queryByText('Misa del lunes')).not.toBeInTheDocument();
  });

  it.each([3, 4])('abre el calendario personal para el rol %s y permite ver eventos parroquiales', async rol => {
    mostrar(rol);
    await screen.findByText('Misa del lunes');
    expect(consultas()[0][1]).toEqual({ params: { fecha_inicio: '2026-10-05', fecha_fin: '2026-10-11', vista: 'personal' } });
    expect(screen.queryByLabelText('Ver horario de un ministro')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Qué deseas consultar'), 'parroquial');
    await waitFor(() => expect(consultas().slice(-1)[0]?.[1]).toEqual({ params: { fecha_inicio: '2026-10-05', fecha_fin: '2026-10-11', vista: 'parroquial' } }));
  });

  it('identifica al coordinador y permite reintentar la carga del directorio', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => {
      if (url === '/api/personas') throw new Error('directorio');
      return { data: datos };
    });
    mostrar(2);
    await screen.findByRole('button', { name: 'Reintentar ministros' });
    expect(screen.getByLabelText('Ver horario de un ministro')).toBeDisabled();
    expect(screen.getByText('Todos mis ministros y eventos')).toBeInTheDocument();
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? [] : datos }));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar ministros' }));
    await screen.findByText('No hay ministros activos en tu directorio.');
  });

  it('avisa a un Sacerdote/Admin de cuentas pendientes y enlaza a /cuentas', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({
      data: url === '/api/personas' ? [{ id: 9, nombre: 'Ana' }]
        : url === '/api/cuentas' ? [{ id: 1, nombre: 'X' }, { id: 2, nombre: 'Y' }]
        : datos,
    }));
    mostrar();
    await screen.findByText('Misa del lunes');
    const aviso = await screen.findByRole('link', { name: /Tienes 2 cuentas pendientes de aprobar/ });
    expect(aviso).toHaveAttribute('href', '/cuentas');
  });

  it('no muestra el aviso de cuentas a un Ministro, aunque haya pendientes', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({
      data: url === '/api/personas' ? [] : url === '/api/cuentas' ? [{ id: 1, nombre: 'X' }] : datos,
    }));
    mostrar(4);
    await screen.findByText('Misa del lunes');
    expect(screen.queryByRole('link', { name: /pendientes de aprobar/ })).not.toBeInTheDocument();
  });

  it('no muestra el aviso a un Sacerdote/Admin cuando no hay cuentas pendientes', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({
      data: url === '/api/personas' ? [{ id: 9, nombre: 'Ana' }] : url === '/api/cuentas' ? [] : datos,
    }));
    mostrar();
    await screen.findByText('Misa del lunes');
    expect(screen.queryByRole('link', { name: /pendientes de aprobar/ })).not.toBeInTheDocument();
  });

  it('descarta datos y filtros cuando cambian el usuario o su rol', async () => {
    const { rerender } = mostrar();
    await screen.findByText('Misa del lunes');
    vi.mocked(apiClient.get).mockResolvedValue({ data: vacio });
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 9, nombre: 'Ana', correo: 'ana@test.com', rol_id: 4 }));
    rerender(<CalendarioPage />);
    expect(screen.queryByText('Misa del lunes')).not.toBeInTheDocument();
    await screen.findAllByText('Sin compromisos registrados');
    expect(consultas().slice(-1)[0]?.[1]).toEqual({ params: { fecha_inicio: '2026-10-05', fecha_fin: '2026-10-11', vista: 'personal' } });
    const anteriores = consultas().length;
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 10, nombre: 'Luis', correo: 'luis@test.com', rol_id: 4 }));
    rerender(<CalendarioPage />);
    await waitFor(() => expect(consultas()).toHaveLength(anteriores + 1));
  });
});

describe('calendario mensual', () => {
  it('consulta semanas completas y permite seleccionar un día sin duplicar sus tareas vinculadas', async () => {
    mostrar();
    await screen.findByText('Misa del lunes');
    await userEvent.click(screen.getByRole('button', { name: 'Mes' }));
    await waitFor(() => expect(consultas().slice(-1)[0]?.[1]).toEqual({ params: { fecha_inicio: '2026-09-28', fecha_fin: '2026-11-01', vista: 'coordinacion' } }));
    const tabla = await screen.findByRole('table');
    const dia = within(tabla).getByRole('button', { name: /lunes.*5 de octubre.*2 compromisos/ });
    await userEvent.click(dia);
    expect(dia).toHaveAttribute('aria-pressed', 'true');
    const detalle = screen.getByRole('region', { name: /Compromisos del lunes.*5 de octubre/ });
    expect(within(detalle).getAllByText('Preparar altar')).toHaveLength(1);
    await userEvent.click(within(detalle).getByRole('button', { name: /Ver detalle del evento/ }));
    expect(screen.getByRole('dialog', { name: 'Misa del lunes' })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Cerrar'));
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await waitFor(() => expect(consultas().slice(-1)[0]?.[1]).toEqual({ params: { fecha_inicio: '2026-10-26', fecha_fin: '2026-12-06', vista: 'coordinacion' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('button', { name: 'Semana' }));
    await screen.findByText('Misa del lunes');
  });

  it('limita los resúmenes y mantiene todos los compromisos en el detalle diario', async () => {
    const muchos = { eventos: [evento, { ...evento, id: 9, titulo: 'Reunión', hora_inicio: '08:00:00', tareas: [], nombre_espacio: null, estado_reserva_id: 1 }], tareas: [tarea, independiente] };
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? [] : muchos }));
    mostrar();
    await screen.findByText('Misa del lunes');
    await userEvent.click(screen.getByRole('button', { name: 'Mes' }));
    const tabla = await screen.findByRole('table');
    const dia = within(tabla).getByRole('button', { name: /lunes.*5 de octubre.*3 compromisos/ });
    expect(within(dia).getByText('Ver los 3 compromisos')).toBeInTheDocument();
    expect(within(dia).getByText('Reunión')).toBeInTheDocument();
    expect(dia).toHaveTextContent('08:00');
    expect(dia).not.toHaveTextContent('Misa del lunes');
    await userEvent.click(dia);
    const detalle = screen.getByRole('region', { name: /Compromisos del lunes.*5 de octubre/ });
    expect(within(detalle).getByText('Visitar enfermos')).toBeInTheDocument();
    expect(within(detalle).getByText('Reunión')).toBeInTheDocument();
    expect(within(detalle).getByText('Pendiente')).toBeInTheDocument();
    await userEvent.click(within(detalle).getByRole('button', { name: /Ver detalle del evento Reunión/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Sin tareas registradas para tu consulta.');
    expect(screen.getByRole('dialog')).toHaveTextContent('Lugar no indicado');
  });

  it('muestra el mes vacío y vuelve al mes actual mediante Hoy', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/personas' ? [] : vacio }));
    mostrar(4);
    await screen.findAllByText('Sin compromisos registrados');
    await userEvent.click(screen.getByRole('button', { name: 'Mes' }));
    await screen.findByText('Sin compromisos registrados en este mes');
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    await waitFor(() => expect(consultas().slice(-1)[0]?.[1]).toEqual({ params: { fecha_inicio: '2026-09-28', fecha_fin: '2026-11-01', vista: 'personal' } }));
  });
});
