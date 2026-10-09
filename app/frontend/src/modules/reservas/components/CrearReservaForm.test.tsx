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
  vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 2, nombre: 'Salón Parroquial', capacidad: 80 }] });
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
});

function mostrar(props: Parameters<typeof CrearReservaForm>[0] = {}) {
  render(<ToastProvider><MemoryRouter><AuthProvider><CrearReservaForm {...props} /></AuthProvider></MemoryRouter></ToastProvider>);
}

async function completar() {
  await screen.findByRole('option', { name: /Salón Parroquial/ });
  fireEvent.change(screen.getByLabelText('Espacio:'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Fecha:'), { target: { value: '2099-10-12' } });
  fireEvent.change(screen.getByLabelText('Hora de Inicio:'), { target: { value: '18:00' } });
  fireEvent.change(screen.getByLabelText('Hora de Fin:'), { target: { value: '20:00' } });
  fireEvent.change(screen.getByLabelText('Título del Evento:'), { target: { value: 'Ensayo del coro' } });
  fireEvent.change(screen.getByLabelText('Descripción del Evento:'), { target: { value: 'Ensayo semanal' } });
}

afterEach(() => vi.useRealTimers());

const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Solicitar Reserva' }));

describe('CrearReservaForm', () => {
  it('avisa con un toast el espacio, fecha, horario y estado pendiente, y limpia el formulario', async () => {
    const onReservaCreada = vi.fn();
    mostrar({ onReservaCreada });
    await completar();
    enviar();

    const aviso = await screen.findByRole('status');
    expect(aviso).toHaveTextContent('Solicitud enviada');
    expect(aviso).toHaveTextContent('Salón Parroquial');
    expect(aviso).toHaveTextContent('Ensayo del coro');
    expect(aviso).toHaveTextContent('18:00 a 20:00');
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
    await waitFor(() => expect(screen.getByLabelText('Espacio:')).toHaveFocus());
  });

  it('no enfoca ningún campo sin autoFocus', async () => {
    mostrar();
    await screen.findByRole('option', { name: /Salón Parroquial/ });
    expect(screen.getByLabelText('Espacio:')).not.toHaveFocus();
  });

  it('lista espacios sin capacidad y tolera que falle la carga de espacios', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 3, nombre: 'Capilla', capacidad: null }] });
    mostrar();
    expect(await screen.findByRole('option', { name: 'Capilla' })).toBeInTheDocument();
  });

  it('deja el selector solo con la opción por defecto si falla la carga de espacios', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red'));
    mostrar();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(screen.getAllByRole('option')).toHaveLength(1);
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
});
