import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CrearReservaForm from './CrearReservaForm';
import { ToastProvider } from '../../../context/ToastContext';
import { AuthProvider } from '../../../context/AuthContext';
import apiClient from '../../../api/client';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(apiClient.get).mockImplementation((url: string) => url.startsWith('/api/reservas')
    ? Promise.resolve({ data: [] })
    : Promise.resolve({ data: [{ id: 2, nombre: 'Salón Parroquial', capacidad: 80 }] }));
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
});

function mostrar(props: Parameters<typeof CrearReservaForm>[0] = {}) {
  render(<ToastProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><CrearReservaForm {...props} /></AuthProvider></MemoryRouter></ToastProvider>);
}

function nombreExacto(nombre: string) {
  return new RegExp(`^${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, capacidad`);
}

async function elegirEspacio(nombre: string) {
  const tarjeta = await screen.findByRole('button', { name: nombreExacto(nombre) });
  fireEvent.click(tarjeta);
}

async function completar() {
  await elegirEspacio('Salón Parroquial');
  fireEvent.change(screen.getByLabelText(/Cantidad de personas esperadas/), { target: { value: '50' } });
  fireEvent.change(screen.getByLabelText('Fecha:'), { target: { value: '2099-10-12' } });
  fireEvent.change(screen.getByLabelText('Hora de Inicio:'), { target: { value: '18:00' } });
  fireEvent.change(screen.getByLabelText('Hora de Fin:'), { target: { value: '20:00' } });
  fireEvent.change(screen.getByLabelText('Título del Evento:'), { target: { value: 'Ensayo del coro' } });
  fireEvent.change(screen.getByLabelText('Descripción del Evento:'), { target: { value: 'Ensayo semanal' } });
}

afterEach(() => vi.useRealTimers());

const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Solicitar Reserva' }));

describe('CrearReservaForm', () => {
  it('no muestra el enlace de ver detalle sin espacio seleccionado, y lo muestra al seleccionar uno', async () => {
    mostrar();
    await screen.findByRole('button', { name: /Salón Parroquial/ });
    expect(screen.queryByRole('link', { name: /Ver detalle del espacio/ })).not.toBeInTheDocument();

    await elegirEspacio('Salón Parroquial');

    const enlace = screen.getByRole('link', { name: /Ver detalle del espacio/ });
    expect(enlace).toHaveAttribute('href', '/espacios/2');
    expect(screen.getByRole('button', { name: /Salón Parroquial/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('selecciona la tarjeta de espacio con Enter o espacio, e ignora otras teclas', async () => {
    mostrar();
    const tarjeta = await screen.findByRole('button', { name: nombreExacto('Salón Parroquial') });

    fireEvent.keyDown(tarjeta, { key: 'a' });
    expect(tarjeta).toHaveAttribute('aria-pressed', 'false');

    fireEvent.keyDown(tarjeta, { key: 'Enter' });
    expect(tarjeta).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(tarjeta, { key: ' ' });
    expect(tarjeta).toHaveAttribute('aria-pressed', 'true');
  });

  it('avisa si excede la capacidad, acepta el límite y envía el aforo numérico', async () => {
    mostrar();
    await completar();
    const campo = screen.getByLabelText(/Cantidad de personas esperadas/);
    fireEvent.change(campo, { target: { value: '81' } });
    enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('supera la capacidad');
    expect(apiClient.post).not.toHaveBeenCalled();
    fireEvent.change(campo, { target: { value: '80' } });
    enviar();
    await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledWith('/api/reservas', expect.objectContaining({ cantidad_personas: 80 }));
    expect(campo).toHaveValue(null);
  });
  it('permite al administrador crear con visibilidad pública y restablece la casilla', async () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id: 5 }));
    mostrar();
    await completar();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar en la agenda pública' }));
    enviar();
    await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledWith('/api/reservas', expect.objectContaining({ publico: true }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('no ofrece publicar a un coordinador ni envía el campo restringido', async () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 7, rol_id: 2 }));
    mostrar();
    await completar();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    enviar();
    await screen.findByRole('status');
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toHaveProperty('publico');
  });
  it('avisa con un toast el espacio, fecha, horario y estado pendiente, y limpia el formulario', async () => {
    const onReservaCreada = vi.fn();
    mostrar({ onReservaCreada });
    await completar();
    enviar();

    const aviso = await screen.findByRole('status');
    expect(aviso).toHaveTextContent('Solicitud enviada');
    expect(aviso).toHaveTextContent('Salón Parroquial');
    expect(aviso).toHaveTextContent('Ensayo del coro');
    expect(aviso).toHaveTextContent('18:00 – 20:00');
    expect(aviso).toHaveTextContent('pendiente de aprobación del sacerdote');
    expect(aviso).toHaveTextContent('Puedes revisar su estado en Mis Reservas.');
    expect(onReservaCreada).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Título del Evento:')).toHaveValue('');
  });

  it('no deja un cuadro de confirmación dentro de la página, solo el toast', async () => {
    mostrar();
    await completar();
    enviar();

    await screen.findByRole('status');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: /Mis Reservas/ })).not.toBeInTheDocument();
  });

  it('al Sacerdote le indica que puede aprobar su propia solicitud', async () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id: 1 }));
    mostrar();
    await completar();
    enviar();

    const aviso = await screen.findByRole('status');
    expect(aviso).toHaveTextContent('pendiente de aprobación.');
    expect(aviso).not.toHaveTextContent('del sacerdote');
    expect(aviso).toHaveTextContent('Puedes aprobarla tú mismo');
  });

  it('muestra los errores como alerta y oculta una confirmación previa', async () => {
    mostrar();
    await completar();
    enviar();
    await screen.findByRole('status');

    enviar(); // formulario ya vacío
    expect(await screen.findByRole('alert')).toHaveTextContent('Por favor completa todos los campos.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('muestra el mensaje del backend si la solicitud falla', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: { message: 'Horario ocupado' } } });
    mostrar();
    await completar();
    enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Horario ocupado');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('enfoca el selector de espacio cuando autoFocus está activo', async () => {
    mostrar({ autoFocus: true });
    await waitFor(() => expect(screen.getByRole('button', { name: /Salón Parroquial/ })).toHaveFocus());
  });

  it('no enfoca ningún campo sin autoFocus', async () => {
    mostrar();
    await screen.findByRole('button', { name: /Salón Parroquial/ });
    expect(screen.getByRole('button', { name: /Salón Parroquial/ })).not.toHaveFocus();
  });

  it('preselecciona el espacio cuando espacioInicial existe en el catálogo', async () => {
    mostrar({ espacioInicial: '2' });
    await screen.findByRole('button', { name: /Salón Parroquial/ });
    expect(screen.getByRole('button', { name: /Salón Parroquial/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Salón Parroquial').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Ver detalle del espacio/ })).toBeInTheDocument();
  });

  it('no preselecciona si espacioInicial no existe en el catálogo cargado', async () => {
    mostrar({ espacioInicial: '999' });
    await screen.findByRole('button', { name: /Salón Parroquial/ });
    expect(screen.getByRole('button', { name: /Salón Parroquial/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('link', { name: /Ver detalle del espacio/ })).not.toBeInTheDocument();
  });

  it('actualiza la cabecera del espacio si la persona cambia el espacio a mano', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        { id: 2, nombre: 'Salón Parroquial', capacidad: 80 },
        { id: 3, nombre: 'Capilla', capacidad: 30 },
      ],
    });
    mostrar({ espacioInicial: '2' });
    await screen.findByRole('link', { name: /Ver detalle del espacio/ });
    expect(screen.getByRole('link', { name: /Ver detalle del espacio/ })).toHaveAttribute('href', '/espacios/2');

    await elegirEspacio('Capilla');
    expect(screen.getByRole('link', { name: /Ver detalle del espacio/ })).toHaveAttribute('href', '/espacios/3');
    expect(screen.getAllByText('Capilla').length).toBeGreaterThan(0);
  });

  it('enfoca la fecha en vez del espacio cuando llega preseleccionado por el QR', async () => {
    mostrar({ autoFocus: true, espacioInicial: '2' });
    await waitFor(() => expect(screen.getByLabelText('Fecha:')).toHaveFocus());
    expect(screen.getByRole('button', { name: /Salón Parroquial/ })).not.toHaveFocus();
  });

  it('avisa y enfoca el selector si el espacio del QR ya no existe en el catálogo', async () => {
    mostrar({ autoFocus: true, espacioInicial: '999' });
    await screen.findByRole('button', { name: /Salón Parroquial/ });
    expect(screen.getByText('El espacio del enlace ya no está disponible. Selecciona uno manualmente.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /Salón Parroquial/ })).toHaveFocus());
  });

  it('lista espacios sin capacidad y tolera que falle la carga de espacios', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 3, nombre: 'Capilla', capacidad: null }] });
    mostrar();
    const tarjeta = await screen.findByRole('button', { name: /Capilla/ });
    expect(tarjeta).toHaveTextContent('Sin capacidad definida');
  });

  it('muestra un mensaje si falla la carga de espacios', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red'));
    mostrar();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(await screen.findByText('No hay espacios disponibles.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salón Parroquial/ })).not.toBeInTheDocument();
  });

  it('con pocos espacios no muestra el buscador ni el botón "ver más"', async () => {
    mostrar();
    await screen.findByRole('button', { name: /Salón Parroquial/ });
    expect(screen.queryByLabelText('Buscar espacio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver \d+ más/ })).not.toBeInTheDocument();
  });

  it('con muchos espacios, filtra por búsqueda y muestra "ver más" para revelar el resto', async () => {
    const muchos = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, nombre: `Espacio ${i + 1}`, capacidad: 10 }));
    vi.mocked(apiClient.get).mockImplementation((url: string) => url.startsWith('/api/reservas')
      ? Promise.resolve({ data: [] })
      : Promise.resolve({ data: muchos }));
    mostrar();
    await screen.findByRole('button', { name: nombreExacto('Espacio 1') });

    // Solo se muestran los primeros 8 hasta que se pida ver más.
    expect(screen.queryByRole('button', { name: nombreExacto('Espacio 9') })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver 4 más' }));
    expect(screen.getByRole('button', { name: nombreExacto('Espacio 9') })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar espacio'), { target: { value: 'Espacio 10' } });
    expect(screen.getByRole('button', { name: nombreExacto('Espacio 10') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: nombreExacto('Espacio 1') })).not.toBeInTheDocument();
  });

  it('rechaza una hora de fin anterior a la de inicio', async () => {
    mostrar();
    await completar();
    fireEvent.change(screen.getByLabelText('Hora de Fin:'), { target: { value: '17:00' } });
    enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('La hora de inicio debe ser menor');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('rechaza una fecha pasada', async () => {
    mostrar();
    await completar();
    fireEvent.change(screen.getByLabelText('Fecha:'), { target: { value: '2000-01-01' } });
    enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('no puede estar en el pasado');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('rechaza una hora de inicio ya pasada en el día de hoy', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2099, 9, 12, 19, 0));
    mostrar();
    await completar(); // 2099-10-12, 18:00–20:00
    enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('La hora de inicio no puede estar en el pasado.');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('muestra un error genérico si el backend no responde', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('offline'));
    mostrar();
    await completar();
    enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de red');
  });

  it('avisa en tiempo real que el horario está disponible cuando no hay conflicto', async () => {
    mostrar();
    await completar();
    expect(await screen.findByText('Horario disponible para este espacio.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar Reserva' })).not.toBeDisabled();
  });

  it('avisa en tiempo real el conflicto con una reserva confirmada y bloquea el envío', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => url.startsWith('/api/reservas')
      ? Promise.resolve({ data: [{
          id: 9, fecha: '2099-10-12', hora_inicio: '17:00:00', hora_fin: '19:00:00',
          estado_reserva_id: 2, evento_titulo: 'Retiro parroquial', solicitante_nombre: 'Coord Grupos',
        }] })
      : Promise.resolve({ data: [{ id: 2, nombre: 'Salón Parroquial', capacidad: 80 }] }));
    mostrar();
    await completar(); // 18:00–20:00, se cruza con 17:00–19:00

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('se cruza con una reserva ya confirmada');
    expect(aviso).toHaveTextContent('Retiro parroquial');
    expect(aviso).toHaveTextContent('Coord Grupos');
    expect(screen.getByRole('button', { name: 'Solicitar Reserva' })).toBeDisabled();
    enviar();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('clickear un día del selector semanal rellena la fecha del formulario, aunque ese día ya tenga reservas', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 14)); // miércoles 14-oct-2026
    vi.mocked(apiClient.get).mockImplementation((url: string) => url.startsWith('/api/reservas')
      ? Promise.resolve({ data: [{
          id: 9, fecha: '2026-10-12', hora_inicio: '09:00:00', hora_fin: '10:00:00', // lunes de esa semana
          estado_reserva_id: 2, evento_titulo: null, solicitante_nombre: 'Alguien',
        }] })
      : Promise.resolve({ data: [{ id: 2, nombre: 'Salón Parroquial', capacidad: 80 }] }));
    mostrar();
    await elegirEspacio('Salón Parroquial');

    const diaOcupado = await screen.findByText('1');
    fireEvent.click(diaOcupado.closest('button')!);

    expect((screen.getByLabelText('Fecha:') as HTMLInputElement).value).toBe('2026-10-12');
  });

  it('no avisa conflicto si la reserva que se cruza no está confirmada', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => url.startsWith('/api/reservas')
      ? Promise.resolve({ data: [{
          id: 9, fecha: '2099-10-12', hora_inicio: '17:00:00', hora_fin: '19:00:00',
          estado_reserva_id: 1, evento_titulo: 'Solicitud pendiente', solicitante_nombre: 'Otro',
        }] })
      : Promise.resolve({ data: [{ id: 2, nombre: 'Salón Parroquial', capacidad: 80 }] }));
    mostrar();
    await completar();
    expect(await screen.findByText('Horario disponible para este espacio.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar Reserva' })).not.toBeDisabled();
  });
});
