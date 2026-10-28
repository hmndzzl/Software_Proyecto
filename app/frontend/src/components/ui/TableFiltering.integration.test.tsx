import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { authValue } from '../../test/authValue';
import { ToastProvider } from '../../context/ToastContext';
import ListaReservas from '../../modules/reservas/components/ListaReservas';
import MisReservasPage from '../../pages/mis-reservas/MisReservasPage';
import ListaEventos from '../../modules/eventos/components/ListaEventos';
import ListaGrupos from '../../modules/grupos/components/ListaGrupos';
import ListaAsignaciones from '../../modules/tareas/components/ListaAsignaciones';
import ListaCambiosTurno from '../../modules/cambioTurno/components/ListaCambiosTurno';
import MinistrosPage from '../../pages/ministers/MinistrosPage';
import CoordinadoresMinistrosPage from '../../pages/coordinadores/CoordinadoresMinistrosPage';
import CuentasPage from '../../pages/cuentas/CuentasPage';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const nombres = ['Celebración Ágape', 'Reunión Juvenil'];
const personas = nombres.map((nombre, i) => ({ id: i + 9, nombre, correo: `correo${i}@test.com`, rol_id: 4, disponible: !i, estado_cuenta: i ? 'rechazada' : 'activa' }));
const reservas = nombres.map((nombre, i) => ({ id: i + 1, espacio_id: i + 1, espacio_nombre: i ? 'Salón' : 'Templo', fecha: `2099-10-${24 + i}`, hora_inicio: i ? '11:00:00' : '09:00:00', hora_fin: i ? '12:00:00' : '10:00:00', estado_reserva_id: i ? 1 : 2, solicitante_id: 1, solicitante_nombre: personas[i].nombre, evento_titulo: nombre, evento_descripcion: nombre }));
const tareas = nombres.map((titulo, i) => ({ id: i + 1, titulo, descripcion: titulo, fecha: `2099-10-${24 + i}`, hora_inicio: '10:00:00', hora_fin: '11:00:00', asignados: [{ persona_id: personas[i].id, nombre: personas[i].nombre }] }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 }));
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (url === '/api/personas') return { data: personas };
    if (url === '/api/coordinadores-ministros') return { data: [{ id: 7, nombre: 'Coordinador', estado_cuenta: 'activa' }] };
    if (url === '/api/coordinadores-ministros/7/ministros') return { data: personas };
    if (url === '/api/cuentas') return { data: personas.map((p, i) => ({ ...p, rol_id: i ? 5 : 4, estado_cuenta: 'pendiente' })) };
    if (url === '/api/tareas') return { data: tareas };
    if (url === '/api/reservas' || url === '/api/reservas/mis-reservas') return { data: reservas };
    if (url === '/api/espacios') return { data: [] };
    if (url === '/api/eventos') return { data: reservas.map(r => ({ ...r, descripcion: r.evento_titulo, nombre_encargado: r.solicitante_nombre, nombre_espacio: r.espacio_nombre })) };
    if (url === '/api/grupos') return { data: nombres.map((nombre, i) => ({ id: i + 1, nombre, nombre_coordinador: personas[i].nombre })) };
    if (url === '/api/cambios-turno') return { data: [1, 2].flatMap(destinatario_id => nombres.map((nombre, i) => ({
      id: destinatario_id * 10 + i, tarea_titulo: nombre, tarea_descripcion: nombre,
      solicitante_nombre: personas[i].nombre, destinatario_nombre: personas[i].nombre,
      solicitante_id: destinatario_id === 1 ? 2 : 1, destinatario_id,
      estado: i ? 'rechazado' : 'pendiente', tarea_fecha: `2099-10-${24 + i}`, tarea_hora_inicio: '10:00:00', tarea_hora_fin: '11:00:00',
    }))) };
    return { data: [] };
  });
});

function mostrar(children: ReactNode) {
  return render(<MemoryRouter><ToastProvider>{children}</ToastProvider></MemoryRouter>);
}

function revisarColumnas(table: HTMLElement) {
  for (const header of within(table).getAllByRole('columnheader')) {
    if (header.textContent === 'Acciones' || !header.textContent) continue;
    expect(within(header).getByRole('button')).toBeInTheDocument();
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-sort', 'none');
  }
}

describe('filtros reales en las tablas principales', () => {
  it.each([
    ['reservas', <ListaReservas />], ['mis reservas', <MisReservasPage />], ['cuentas', <CuentasPage />],
  ])('abre y cierra el historial desde %s sin modificar los datos', async (_nombre, component) => {
    const anterior = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
      if (url.endsWith('/decisiones')) return { data: [{ id: 1, resultado: 'aprobada', actor_id: 1, actor_nombre: 'Padre Luis', fecha: '2026-10-25T14:00:00Z' }] };
      return anterior(url, config);
    });
    mostrar(component);
    const table = await screen.findByRole('table');
    await userEvent.click(within(table).getAllByRole('button', { name: 'Ver detalle' })[0]);
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText('Por Padre Luis')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
  it.each([
    ['reservas', <ListaReservas />], ['mis reservas', <MisReservasPage />], ['eventos', <ListaEventos />],
    ['grupos', <ListaGrupos />], ['tareas', <ListaAsignaciones />], ['ministros', <MinistrosPage />],
  ])('busca, limpia y ordena todas las columnas de %s', async (_nombre, component) => {
    mostrar(component);
    const table = await screen.findByRole('table');
    revisarColumnas(table);
    await userEvent.type(screen.getByLabelText('Buscar'), 'AGAPE');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).queryByText('Reunión Juvenil')).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Buscar'));
    await userEvent.type(screen.getByLabelText('Buscar'), 'sin coincidencias');
    expect(screen.getByText('No hay resultados para los filtros seleccionados.')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('combina estado, espacio y rango inclusivo en reservas', async () => {
    mostrar(<ListaReservas />);
    const table = await screen.findByRole('table');
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'Pendiente');
    await userEvent.selectOptions(screen.getByLabelText('Espacio'), 'Salón');
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2099-10-25' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2099-10-25' } });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getAllByText('Reunión Juvenil').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2099-10-24' } });
    expect(screen.getByRole('alert')).toHaveTextContent('inicial');
  });

  it('filtra disponibilidad y rol en el directorio', async () => {
    mostrar(<MinistrosPage />);
    const table = await screen.findByRole('table');
    await userEvent.selectOptions(screen.getByLabelText('Disponibilidad'), 'No disponible');
    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'Ministro');
    expect(within(table).queryByText('Celebración Ágape')).not.toBeInTheDocument();
    expect(within(table).getByText('Reunión Juvenil')).toBeInTheDocument();
  });

  it('filtra y ordena por separado las solicitudes de cambio recibidas y enviadas', async () => {
    mostrar(<ListaCambiosTurno />);
    const tables = await screen.findAllByRole('table');
    tables.forEach(revisarColumnas);
    const recibidos = screen.getByRole('region', { name: 'Filtros de cambios recibidos' });
    await userEvent.selectOptions(within(recibidos).getByLabelText('Estado'), 'Pendiente');
    expect(within(tables[0]).getAllByRole('row')).toHaveLength(2);
    expect(within(tables[1]).getAllByRole('row')).toHaveLength(3);
    const enviados = screen.getByRole('region', { name: 'Filtros de cambios enviados' });
    await userEvent.type(within(enviados).getByLabelText('Buscar'), 'juvenil');
    expect(within(tables[1]).getAllByRole('row')).toHaveLength(2);
  });

  it('filtra y ordena también los ministros de un coordinador', async () => {
    mostrar(<CoordinadoresMinistrosPage />);
    await userEvent.selectOptions(await screen.findByLabelText('Coordinador de ministros'), '7');
    const table = await screen.findByRole('table');
    revisarColumnas(table);
    await userEvent.selectOptions(screen.getByLabelText('Cuenta'), 'No activa');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Reunión Juvenil')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Buscar'), 'sin resultado');
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('ordena las tres pestañas de cuentas y filtra usando el rol que se muestra', async () => {
    mostrar(<CuentasPage />);
    for (const pestana of ['Pendientes', 'Activas', 'Rechazadas']) {
      await userEvent.click(screen.getByRole('tab', { name: pestana }));
      const table = await screen.findByRole('table');
      revisarColumnas(table);
      await userEvent.type(screen.getByLabelText('Buscar'), 'agape');
      expect(within(table).getAllByRole('row')).toHaveLength(2);
      await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
      if (pestana === 'Activas') {
        await userEvent.selectOptions(screen.getByLabelText('Rol'), 'Administrador');
      } else {
        await userEvent.selectOptions(screen.getByLabelText('Rol para Reunión Juvenil'), '5');
        await userEvent.selectOptions(screen.getByLabelText('Rol a asignar'), 'Administrador');
      }
      await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(2));
      expect(within(table).getByText('Reunión Juvenil')).toBeInTheDocument();
    }
  });
});
