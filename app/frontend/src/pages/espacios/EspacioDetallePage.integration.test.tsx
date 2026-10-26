import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { authValue } from '../../test/authValue';
import { ROLES } from '../../utils/roles';
import EspacioDetallePage from './EspacioDetallePage';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const espacio = { id: 5, nombre: 'Salón Mayor', capacidad: 120, disponible: true };
const reservas = [
  { id: 1, fecha: '2099-10-20', hora_inicio: '08:00:00', hora_fin: '09:00:00', estado_reserva_id: 1, evento_titulo: 'Catequesis', evento_descripcion: 'Grupo juvenil', solicitante_nombre: 'Luis Pérez' },
  { id: 2, fecha: '2099-10-21', hora_inicio: '10:00:00', hora_fin: '11:00:00', estado_reserva_id: 2, evento_titulo: null, evento_descripcion: null, solicitante_nombre: null },
  { id: 3, fecha: '2099-10-22', hora_inicio: '12:00:00', hora_fin: '13:00:00', estado_reserva_id: 3, evento_titulo: 'Reunión', evento_descripcion: null, solicitante_nombre: 'Ana Gómez' },
  { id: 4, fecha: '2099-10-23', hora_inicio: '14:00:00', hora_fin: '15:00:00', estado_reserva_id: 99, evento_titulo: null, evento_descripcion: 'Descripción sola', solicitante_nombre: 'Ana Gómez' },
];

function Destino() { const loc = useLocation(); return <p>Destino {loc.pathname}{loc.search}</p>; }
function mostrar() {
  return render(
    <ToastProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/espacios/5']}><Routes>
      <Route path="/espacios/:id" element={<EspacioDetallePage />} />
      <Route path="*" element={<Destino />} />
    </Routes></MemoryRouter></ToastProvider>
  );
}

describe('integración del detalle de un espacio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'a@test.com', rol_id: ROLES.ADMIN }));
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacio : reservas }));
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
  });

  it('muestra información, todos los estados y navega desde sus acciones', async () => {
    mostrar();
    await screen.findByRole('heading', { name: 'Salón Mayor' });
    expect(screen.getByText('120 personas')).toBeInTheDocument();
    expect(screen.getByText('Catequesis')).toBeInTheDocument();
    expect(screen.getByText('Reserva #2')).toBeInTheDocument();
    expect(screen.getByText('Descripción sola')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Rechazada')).toBeInTheDocument();
    expect(screen.getByText('Desconocido')).toBeInTheDocument();
    expect(screen.getByText('Registrado por: Luis Pérez')).toBeInTheDocument();
    expect(screen.getAllByText('Registrado por: Ana Gómez').length).toBe(2);
    expect(screen.getByText('Registrado por: Desconocido')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reservar' }));
    expect(await screen.findByText('Destino /reservas?espacio_id=5')).toBeInTheDocument();
  });

  it('aprueba y rechaza una reserva, notifica y vuelve a consultar', async () => {
    mostrar();
    await screen.findByText('Catequesis');
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/1/estado', { estado_id: 2 }));
    expect(await screen.findByRole('status')).toHaveTextContent('Reserva aprobada');
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Rechazar reserva' })).getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar reserva' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/1/estado', { estado_id: 3 }));
    expect(await screen.findByRole('status')).toHaveTextContent('Reserva rechazada');
  });

  it('muestra el error del servidor al cambiar estado y oculta acciones sin permiso', async () => {
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { message: 'Conflicto de horario' } } });
    const vista = mostrar();
    await screen.findByText('Catequesis');
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de horario');

    vista.unmount();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 4, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO }));
    mostrar();
    await screen.findByText('Catequesis');
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
  });

  it('presenta capacidad no definida y una lista vacía', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? { ...espacio, capacidad: null } : [] }));
    mostrar();
    expect(await screen.findByText('No definida')).toBeInTheDocument();
    expect(screen.getByText('No hay reservas para este espacio.')).toBeInTheDocument();
  });

  it('presenta errores, permite volver y reintenta la carga', async () => {
    vi.mocked(apiClient.get)
      .mockRejectedValueOnce({ response: { data: { message: 'Espacio eliminado' } } })
      .mockResolvedValueOnce({ data: [] })
      .mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacio : reservas }));
    mostrar();
    expect(await screen.findByText('Espacio eliminado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    await screen.findByRole('heading', { name: 'Salón Mayor' });
    await userEvent.click(screen.getByRole('button', { name: 'Espacios' }));
    expect(await screen.findByText('Destino /espacios')).toBeInTheDocument();
  });

  it('abre y cierra el modal de código QR para Admin/Sacerdote', async () => {
    mostrar();
    await screen.findByText('Catequesis');

    await userEvent.click(screen.getByRole('button', { name: /Ver código QR/i }));
    expect(await screen.findByText(/Código QR · Salón Mayor/i)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cerrar'));
    expect(screen.queryByText(/Código QR · Salón Mayor/i)).not.toBeInTheDocument();
  });

  it('no muestra el botón de código QR a un Ministro', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 4, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO }));
    mostrar();
    await screen.findByText('Catequesis');
    expect(screen.queryByRole('button', { name: /Ver código QR/i })).not.toBeInTheDocument();
  });

  it('un Ministro ve el salón en modo solo lectura, sin botón Reservar', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 4, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO }));
    mostrar();
    await screen.findByText('Catequesis');
    expect(screen.queryByRole('button', { name: 'Reservar' })).not.toBeInTheDocument();
    expect(screen.getByText(/No tienes permisos para reservar este salón/i)).toBeInTheDocument();
  });

  it('muestra el calendario de reservas confirmadas junto a la lista existente, sin reemplazarla', async () => {
    mostrar();
    await screen.findByText('Catequesis');
    expect(screen.getByRole('heading', { name: 'Próximas Reservas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Calendario del Espacio' })).toBeInTheDocument();
  });

  it('muestra la reserva propia disponible para check-in y confirma al tocar el botón', async () => {
    const espacioConCheckin = {
      ...espacio,
      en_uso: false,
      reservas_checkin_disponible: [
        { id: 10, hora_inicio: '14:00:00', hora_fin: '16:00:00', solicitante_id: 1, solicitante_nombre: 'Admin', checkin_en: null },
      ],
    };
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacioConCheckin : reservas }));
    mostrar();
    await screen.findByText('Catequesis');

    expect(screen.getByText(/Se detectó una reserva a tu nombre/)).toBeInTheDocument();
    expect(screen.getByText(/14:00 – 16:00/)).toBeInTheDocument();
    expect(screen.getByText(/¿Deseas confirmar el check-in/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sí, confirmar check-in' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/10/checkin', {}));
  });

  it('identifica por nombre una reserva ajena cuando el actor es privilegiado', async () => {
    const espacioConCheckinAjeno = {
      ...espacio,
      en_uso: false,
      reservas_checkin_disponible: [
        { id: 11, hora_inicio: '17:00:00', hora_fin: '18:00:00', solicitante_id: 2, solicitante_nombre: 'María Gómez', checkin_en: null },
      ],
    };
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacioConCheckinAjeno : reservas }));
    mostrar();
    await screen.findByText('Catequesis');

    expect(screen.getByText(/Se detectó una reserva a nombre de/)).toBeInTheDocument();
    expect(screen.getByText('María Gómez')).toBeInTheDocument();
  });

  it('muestra "en uso ahora" y el check-in ya hecho cuando checkin_en viene con valor', async () => {
    const espacioEnUso = {
      ...espacio,
      en_uso: true,
      reservas_checkin_disponible: [
        { id: 10, hora_inicio: '14:00:00', hora_fin: '16:00:00', solicitante_id: 1, solicitante_nombre: 'Admin', checkin_en: '2026-08-11 13:50:00' },
      ],
    };
    const reservasConEnUso = [
      { id: 10, fecha: '2099-10-20', hora_inicio: '14:00:00', hora_fin: '16:00:00', estado_reserva_id: 2, evento_titulo: 'Ensayo de coro', evento_descripcion: null, solicitante_nombre: 'Admin', checkin_en: '2026-08-11 13:50:00', en_uso: true },
    ];
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacioEnUso : reservasConEnUso }));
    mostrar();
    await screen.findByText('Ensayo de coro');

    expect(screen.getByText('En uso ahora')).toBeInTheDocument();
    expect(screen.getByText(/Check-in hecho a las 13:50/)).toBeInTheDocument();
    expect(screen.queryByText(/¿Deseas confirmar el check-in/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sí, confirmar check-in' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /En uso ahora/ }));
    expect(await screen.findByRole('heading', { name: 'Ensayo de coro' })).toBeInTheDocument();
    expect(screen.getByText('En uso por: Admin')).toBeInTheDocument();
  });

  it('muestra "Libre" cuando ningún horario está en uso en este momento', async () => {
    const vista = mostrar();
    await screen.findByText('Catequesis');
    const estadoWrap = vista.container.querySelector('[class*="estadoActualWrap"]') as HTMLElement;
    expect(within(estadoWrap).getByText('Libre')).toBeInTheDocument();
    expect(within(estadoWrap).queryByText('En uso ahora')).not.toBeInTheDocument();
  });

  it('muestra el aviso de "sin reserva en este horario" cuando no hay nada para check-in', async () => {
    mostrar();
    await screen.findByText('Catequesis');
    expect(screen.getByText('No tienes una reserva en este horario.')).toBeInTheDocument();
  });

  it('no muestra la sección de check-in a un Ministro', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 4, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO }));
    mostrar();
    await screen.findByText('Catequesis');
    expect(screen.queryByText('No tienes una reserva en este horario.')).not.toBeInTheDocument();
  });

  it('usa mensajes de red de respaldo al cargar y cambiar estado', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: [] });
    const vista = mostrar();
    expect(await screen.findByText('Espacio no encontrado')).toBeInTheDocument();
    vista.unmount();

    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacio : reservas }));
    vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('red'));
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error al cambiar el estado de la reserva');
  });

  it('muestra error cuando el check-in falla', async () => {
    const espacioConCheckin = {
      ...espacio,
      en_uso: false,
      reservas_checkin_disponible: [
        { id: 10, hora_inicio: '14:00:00', hora_fin: '16:00:00', solicitante_id: 1, solicitante_nombre: 'Admin', checkin_en: null },
      ],
    };
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacioConCheckin : reservas }));
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { message: 'Fallo al hacer check-in' } } });
    mostrar();
    await screen.findByText('Catequesis');
    await userEvent.click(screen.getByRole('button', { name: 'Sí, confirmar check-in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo al hacer check-in');
  });

  it('permite volver al listado de espacios cuando ocurre un error de carga', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: [] });
    mostrar();
    expect(await screen.findByText('Espacio no encontrado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Volver a Espacios' }));
    expect(await screen.findByText('Destino /espacios')).toBeInTheDocument();
  });

  it('abre el modal de en uso con valores por defecto cuando no tiene título ni solicitante ni checkin_en', async () => {
    const espacioEnUso = { ...espacio, en_uso: true, reservas_checkin_disponible: [] };
    const reservasConEnUso = [
      { id: 15, fecha: '2099-10-20', hora_inicio: '14:00:00', hora_fin: '16:00:00', estado_reserva_id: 2, evento_titulo: null, evento_descripcion: null, solicitante_nombre: null, checkin_en: null, en_uso: true },
    ];
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacioEnUso : reservasConEnUso }));
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: /En uso ahora/ }));
    expect(await screen.findByRole('heading', { name: 'Reserva #15' })).toBeInTheDocument();
    expect(screen.getByText('En uso por: Desconocido')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('heading', { name: 'Reserva #15' })).not.toBeInTheDocument();
  });

  it('muestra textos de respaldo al rechazar una reserva sin solicitante ni título', async () => {
    const reservasSinDatos = [
      { id: 20, fecha: '2099-10-21', hora_inicio: '10:00:00', hora_fin: '11:00:00', estado_reserva_id: 1, evento_titulo: null, evento_descripcion: null, solicitante_nombre: null },
    ];
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacio : reservasSinDatos }));
    mostrar();
    await screen.findByText('Reserva #20');
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(screen.getByRole('dialog', { name: 'Rechazar reserva' })).toHaveTextContent('¿Rechazar la solicitud de esta persona para Salón Mayor?');
  });

  it('muestra check-in hecho con cadena sin espacio de separación', async () => {
    const espacioCheckinSinEspacio = {
      ...espacio,
      en_uso: false,
      reservas_checkin_disponible: [
        { id: 10, hora_inicio: '14:00:00', hora_fin: '16:00:00', solicitante_id: 1, solicitante_nombre: 'Admin', checkin_en: 'sin_espacio' },
      ],
    };
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacioCheckinSinEspacio : [] }));
    mostrar();
    expect(await screen.findByText(/Check-in hecho a las/)).toBeInTheDocument();
  });
});
