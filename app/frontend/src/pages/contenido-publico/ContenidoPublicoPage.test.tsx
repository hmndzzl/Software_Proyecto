import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContenidoPublicoPage from './ContenidoPublicoPage';
import apiClient from '../../api/client';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const contenido = {
  nombre_parroquia: 'Parroquia San Pedro Nolasco',
  lema: 'Casa de oración',
  titulo_principal: 'Una comunidad viva',
  descripcion_principal: 'Descripción principal.',
  quienes_somos: {
    titulo: 'Nuestra historia',
    descripcion: 'Descripción institucional.',
    mision: 'Acompañar a la comunidad.',
    comunidad: 'Una comunidad abierta.',
    servicio: 'Servimos con alegría.',
  },
  cantidad_grupos: 12,
  cantidad_espacios: 7,
  valores_encabezado: { titulo: 'Nuestros valores', descripcion: 'Principios de la comunidad.' },
  valores: [{ titulo: 'Servicio', descripcion: 'Acompañamos a todos.' }],
  horarios_misa: [{ dias: 'Domingo', horas: ['08:00'] }],
  horarios_oficina: [{ dias: 'Lunes a viernes', horario: '09:00 – 13:00' }],
  contacto: { titulo: 'Contáctanos', direccion: 'Guatemala', correo: 'contacto@example.com', telefono: '+502 5555 1234' },
  texto_pie: 'Una comunidad de fe.',
};

describe('ContenidoPublicoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: contenido });
  });

  it('carga el contenido administrativo y publica solo el campo editado', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: contenido })
      .mockResolvedValueOnce({ data: { ...contenido, titulo_principal: 'Bienvenidos a nuestra parroquia' } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { titulo_principal: 'Bienvenidos a nuestra parroquia' } });

    render(<ContenidoPublicoPage />);

    const tituloPrincipal = await screen.findByDisplayValue('Una comunidad viva');
    await userEvent.clear(tituloPrincipal);
    await userEvent.type(tituloPrincipal, 'Bienvenidos a nuestra parroquia');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', {
      titulo_principal: 'Bienvenidos a nuestra parroquia',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Los cambios se publicaron');
  });

  it('permite agregar una tarjeta de valor y la envía como una lista completa', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });

    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Servicio');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar valor' }));
    fireEvent.change(document.getElementById('valor-titulo-1')!, { target: { value: 'Esperanza' } });
    fireEvent.change(document.getElementById('valor-descripcion-1')!, { target: { value: 'Confiamos en el futuro.' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', expect.objectContaining({
      valores: [
        { titulo: 'Servicio', descripcion: 'Acompañamos a todos.' },
        { titulo: 'Esperanza', descripcion: 'Confiamos en el futuro.' },
      ],
    })));
  });

  it('muestra un mensaje útil y permite reintentar cuando no puede cargar el contenido', async () => {
    const errorSesion = Object.assign(new Error('Sesión vencida'), {
      isAxiosError: true,
      response: { data: { mensaje: 'Sesión vencida' } },
    });
    vi.mocked(apiClient.get).mockRejectedValueOnce(errorSesion).mockResolvedValueOnce({ data: contenido });

    render(<ContenidoPublicoPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sesión vencida');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByDisplayValue('Una comunidad viva')).toBeInTheDocument();
  });
});
