import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ContactoForm from './ContactoForm';
import { enviarContacto } from '../../api/contacto';
import apiClient from '../../api/client';

vi.mock('../../api/client', () => ({ default: { post: vi.fn() } }));

const payload = {
  nombre: 'María Elena Guzmán',
  correo: 'maria@example.com',
  telefono: '+502 5555 1234',
  motivo: 'Información general',
  mensaje: 'Quisiera saber los horarios de misa del domingo.',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
});

function mostrar() {
  render(<ContactoForm />);
}
function completar() {
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: payload.nombre } });
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: payload.telefono } });
  fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: payload.correo } });
  fireEvent.change(screen.getByLabelText(/Mensaje/), { target: { value: payload.mensaje } });
}
function enviar() { fireEvent.submit(screen.getByRole('form')); }

describe('Formulario de contacto (landing page, HU-32)', () => {
  it('envía los campos completos; muestra éxito y limpia el formulario', async () => {
    mostrar(); completar(); enviar();
    await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledWith('/api/contacto', payload);
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
    expect(screen.getByLabelText(/Mensaje/)).toHaveValue('');
  });

  it('envía sin teléfono (opcional) como undefined', async () => {
    mostrar(); completar();
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '' } });
    enviar(); await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledWith('/api/contacto', { ...payload, telefono: undefined });
  });

  it('recorta espacios exteriores antes de enviar', async () => {
    mostrar(); completar();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: `  ${payload.nombre}  ` } });
    fireEvent.change(screen.getByLabelText(/Mensaje/), { target: { value: `\n${payload.mensaje}\n` } });
    enviar(); await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledWith('/api/contacto', payload);
  });

  it.each([
    { campo: /Nombre/, valor: '' },
    { campo: /Nombre/, valor: '   ' },
    { campo: /Correo electrónico/, valor: '' },
    { campo: /Correo electrónico/, valor: 'no-es-un-correo' },
    { campo: /Mensaje/, valor: '' },
    { campo: /Mensaje/, valor: '   ' },
  ])('rechaza $campo inválido antes del POST', ({ campo, valor }) => {
    mostrar(); completar();
    fireEvent.change(screen.getByLabelText(campo), { target: { value: valor } });
    enviar();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('conserva los datos ante un error y permite reintentar', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('sin conexión'));
    mostrar(); completar(); enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Tus datos se conservaron');
    expect(screen.getByLabelText(/Nombre/)).toHaveValue(payload.nombre);
    enviar(); await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it('muestra el mensaje de error del servidor cuando existe', async () => {
    const axiosError = Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { data: { mensaje: 'Demasiados mensajes enviados. Inténtalo de nuevo en 15 minutos.' } },
    });
    vi.mocked(apiClient.post).mockRejectedValueOnce(axiosError);
    mostrar(); completar(); enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados mensajes enviados');
  });

  it('bloquea envíos repetidos durante la solicitud', async () => {
    let terminar!: () => void;
    vi.mocked(apiClient.post).mockImplementationOnce(() => new Promise(resolve => { terminar = () => resolve({ data: {} }); }));
    mostrar(); completar(); enviar(); enviar();
    expect(screen.getByRole('button', { name: 'ENVIANDO…' })).toBeDisabled();
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    terminar(); await screen.findByRole('status');
  });

  it('el cliente conserva el contrato del endpoint', async () => {
    await enviarContacto(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/contacto', payload);
  });
});
