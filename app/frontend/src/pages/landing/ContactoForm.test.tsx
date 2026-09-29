import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ContactoForm from './ContactoForm';
import { enviarContacto } from '../../api/contacto';
import apiClient from '../../api/client';

vi.mock('../../api/client', () => ({ default: { post: vi.fn() } }));

const telefonoLocal = '55551234';
const payload = {
  nombre: 'María Elena Guzmán',
  correo: 'maria@example.com',
  telefono: `+502${telefonoLocal}`,
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
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: telefonoLocal } });
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

  it('muestra el prefijo fijo +502 junto al campo de teléfono', () => {
    mostrar();
    expect(screen.getByText('+502')).toBeInTheDocument();
  });

  it('descarta caracteres no numéricos y limita el teléfono a 8 dígitos', async () => {
    mostrar(); completar();
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: 'abc5555-1234extra' } });
    enviar(); await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledWith('/api/contacto', { ...payload, telefono: '+50255551234' });
  });

  it('rechaza un teléfono con menos de 8 dígitos', () => {
    mostrar(); completar();
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '5551234' } });
    enviar();
    expect(screen.getByRole('alert')).toHaveTextContent('8 dígitos');
    expect(apiClient.post).not.toHaveBeenCalled();
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

  describe('motivo "Otro"', () => {
    it('muestra un campo para especificar el motivo al elegir "Otro" y lo antepone al enviar', async () => {
      mostrar(); completar();
      fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Otro' } });
      fireEvent.change(screen.getByLabelText(/Especifica el motivo/), { target: { value: 'Quiero donar un banco para la capilla' } });
      enviar(); await screen.findByRole('status');
      expect(apiClient.post).toHaveBeenCalledWith('/api/contacto', {
        ...payload, motivo: 'Otro: Quiero donar un banco para la capilla',
      });
    });

    it('rechaza "Otro" sin especificar el motivo', () => {
      mostrar(); completar();
      fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Otro' } });
      enviar();
      expect(screen.getByRole('alert')).toHaveTextContent('Especifica el motivo');
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('no muestra el campo de especificar motivo para otras opciones', () => {
      mostrar();
      expect(screen.queryByLabelText(/Especifica el motivo/)).not.toBeInTheDocument();
    });
  });
});
