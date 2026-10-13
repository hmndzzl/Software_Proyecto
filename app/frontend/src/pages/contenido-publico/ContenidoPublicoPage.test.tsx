import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  horarios_misa: [{ dias: 'Domingo', horas: ['08:00', '11:00'] }],
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

  it('muestra el mensaje predeterminado ante un error de carga no reconocido', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Sin conexión'));
    render(<ContenidoPublicoPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el contenido público');
  });

  it('edita todas las secciones y administra valores y horarios dinámicos', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Una comunidad viva');
    const cambiar = (id: string, valor: string) => {
      const campo = document.getElementById(id) ?? screen.getByLabelText(id);
      fireEvent.change(campo, { target: { value: valor } });
    };

    cambiar('lema', 'Casa renovada');
    cambiar('titulo-principal', 'Una comunidad renovada');
    cambiar('descripcion-principal', 'Nueva descripción principal.');
    cambiar('quienes-titulo', 'Nueva historia');
    cambiar('quienes-descripcion', 'Nueva descripción institucional.');
    cambiar('quienes-mision', 'Nueva misión.');
    cambiar('quienes-comunidad', 'Nueva comunidad.');
    cambiar('quienes-servicio', 'Nuevo servicio.');
    cambiar('cantidad-grupos', '15');
    cambiar('cantidad-espacios', '9');
    cambiar('valores-titulo', 'Valores renovados');
    cambiar('valores-descripcion', 'Nueva descripción de valores.');
    cambiar('valor-titulo-0', 'Servicio renovado');
    cambiar('valor-descripcion-0', 'Acompañamos con alegría.');

    await userEvent.click(screen.getByRole('button', { name: 'Agregar valor' }));
    cambiar('valor-titulo-1', 'Esperanza');
    cambiar('valor-descripcion-1', 'Confiamos en el futuro.');
    await userEvent.click(within(document.getElementById('valor-titulo-0')!.closest('article')!).getByRole('button', { name: 'Eliminar' }));

    cambiar('misa-dias-0', 'Domingo y festivos');
    cambiar('Hora 1 del horario de misa 1', '09:00');
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar hora' }));
    cambiar('Hora 3 del horario de misa 1', '18:00');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar hora 3 del horario de misa 1' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar horario' })[0]);
    cambiar('misa-dias-1', 'Sábado');
    cambiar('Hora 1 del horario de misa 2', '17:00');
    await userEvent.click(within(document.getElementById('misa-dias-1')!.closest('article')!).getByRole('button', { name: 'Eliminar' }));

    cambiar('oficina-dias-0', 'Martes a viernes');
    cambiar('oficina-horario-0', '10:00 – 15:00');
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar horario' })[1]);
    cambiar('oficina-dias-1', 'Sábado');
    cambiar('oficina-horario-1', '09:00 – 12:00');
    await userEvent.click(within(document.getElementById('oficina-dias-1')!.closest('article')!).getByRole('button', { name: 'Eliminar' }));

    cambiar('contacto-titulo', 'Escríbenos');
    cambiar('contacto-correo', 'oficina@example.com');
    cambiar('contacto-direccion', 'Zona 1\nGuatemala');
    cambiar('contacto-telefono', '+502 5555 0000');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', expect.objectContaining({
      lema: 'Casa renovada',
      cantidad_grupos: 15,
      valores: [{ titulo: 'Esperanza', descripcion: 'Confiamos en el futuro.' }],
      horarios_misa: [{ dias: 'Domingo y festivos', horas: ['09:00', '11:00'] }],
      horarios_oficina: [{ dias: 'Martes a viernes', horario: '10:00 – 15:00' }],
      contacto: expect.objectContaining({ correo: 'oficina@example.com' }),
    })));
  });

  it('descarta cambios y avisa cuando no hay nada nuevo que publicar', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: contenido });
    render(<ContenidoPublicoPage />);

    const lema = await screen.findByDisplayValue('Casa de oración');
    fireEvent.change(lema, { target: { value: 'Cambio temporal' } });
    await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(await screen.findByDisplayValue('Casa de oración')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No hay cambios pendientes');
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('permite dejar vacías las listas dinámicas', async () => {
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Una comunidad viva');
    await userEvent.click(within(screen.getByRole('heading', { name: 'Valor 01' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(within(screen.getByRole('heading', { name: 'Horario de misa 1' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(within(screen.getByRole('heading', { name: 'Horario de oficina 1' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));

    expect(screen.getByText('No hay valores publicados.')).toBeInTheDocument();
    expect(screen.getByText('No hay horarios de misa publicados.')).toBeInTheDocument();
    expect(screen.getByText('No hay horarios de oficina publicados.')).toBeInTheDocument();
  });

  it('conserva el borrador y muestra un error cuando el guardado falla', async () => {
    const errorGuardado = Object.assign(new Error('Sin conexión'), { isAxiosError: true, response: { data: { mensaje: 'No autorizado' } } });
    vi.mocked(apiClient.patch).mockRejectedValueOnce(errorGuardado);
    render(<ContenidoPublicoPage />);

    const lema = await screen.findByDisplayValue('Casa de oración');
    fireEvent.change(lema, { target: { value: 'Contenido pendiente' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No autorizado');
    expect(screen.getByDisplayValue('Contenido pendiente')).toBeInTheDocument();
  });

  it('confirma la publicación aunque la recarga posterior no esté disponible', async () => {
    const errorRecarga = Object.assign(new Error('Sin conexión'), { isAxiosError: true, response: { data: { mensaje: 'Sin conexión' } } });
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: contenido }).mockRejectedValueOnce(errorRecarga);
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { lema: 'Casa publicada' } });
    render(<ContenidoPublicoPage />);

    const lema = await screen.findByDisplayValue('Casa de oración');
    fireEvent.change(lema, { target: { value: 'Casa publicada' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Los cambios se publicaron');
    expect(screen.getByDisplayValue('Casa publicada')).toBeInTheDocument();
  });
});
