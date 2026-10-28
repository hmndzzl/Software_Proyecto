import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContenidoPublicoPage from './ContenidoPublicoPage';
import apiClient from '../../api/client';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }));

const FOTO_1 = '/uploads/landing/subidas/00000000-0000-0000-0000-000000000001.webp';
const FOTO_2 = '/uploads/landing/subidas/00000000-0000-0000-0000-000000000002.webp';
const archivoPng = () => new File(['x'], 'portada.png', { type: 'image/png' });

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
  historia: { titulo: 'Origen de la Orden', descripcion: 'Cómo nació la Merced.', tarjetas: [] },
  fechas: { titulo: 'Fechas del año', descripcion: 'Calendario mercedario.', tarjetas: [] },
  devocion: {
    titulo: 'Devoción mariana',
    descripcion: 'Cómo honramos a María.',
    oracion: { titulo: 'Oración de la casa', texto: 'Padre nuestro.\n\nAmén.' },
    tarjetas: [{ titulo: 'Rosario', descripcion: 'Rezo diario.' }],
  },
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

  it('agrega una tarjeta informativa de nuestra historia y la envía como lista completa', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Origen de la Orden');
    expect(screen.getByText('No hay tarjetas informativas publicadas.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agregar tarjeta informativa' }));
    fireEvent.change(document.getElementById('historia-tarjeta-titulo-0')!, { target: { value: 'Historia' } });
    fireEvent.change(document.getElementById('historia-tarjeta-lema-0')!, { target: { value: 'Libres para liberar' } });
    fireEvent.change(document.getElementById('historia-tarjeta-resumen-0')!, { target: { value: 'Resumen breve.' } });
    fireEvent.change(document.getElementById('historia-tarjeta-detalle-0')!, { target: { value: 'Primera parte.\n\nSegunda parte.' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', {
      historia: { tarjetas: [{ titulo: 'Historia', lema: 'Libres para liberar', resumen: 'Resumen breve.', detalle: 'Primera parte.\n\nSegunda parte.' }] },
    }));
  });

  it('elimina una tarjeta informativa de nuestra historia tras confirmar', async () => {
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Origen de la Orden');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar tarjeta informativa' }));
    fireEvent.change(document.getElementById('historia-tarjeta-titulo-0')!, { target: { value: 'Historia' } });
    await userEvent.click(within(screen.getByRole('heading', { name: 'Tarjeta informativa 01' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText(/¿Eliminar la tarjeta «Historia» de Nuestra historia del borrador\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar tarjeta' }));
    expect(screen.getByText('No hay tarjetas informativas publicadas.')).toBeInTheDocument();
  });

  it('agrega y elimina una fecha importante y la publica como lista completa', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Fechas del año');
    expect(screen.getByText('No hay fechas importantes publicadas.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agregar fecha' }));
    fireEvent.change(document.getElementById('fecha-tarjeta-fecha-0')!, { target: { value: '24 de septiembre' } });
    fireEvent.change(document.getElementById('fecha-tarjeta-titulo-0')!, { target: { value: 'Nuestra Señora de la Merced' } });
    fireEvent.change(document.getElementById('fecha-tarjeta-descripcion-0')!, { target: { value: 'Festividad solemne.' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', {
      fechas: { tarjetas: [{ fecha: '24 de septiembre', titulo: 'Nuestra Señora de la Merced', descripcion: 'Festividad solemne.' }] },
    }));

    await userEvent.click(screen.getByRole('button', { name: 'Agregar fecha' }));
    await userEvent.click(within(screen.getByRole('heading', { name: 'Fecha 01' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText(/¿Eliminar la fecha «Fecha 1» de las fechas importantes del borrador\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar fecha' }));
    expect(screen.getByText('No hay fechas importantes publicadas.')).toBeInTheDocument();
  });

  it('publica la oración y las tarjetas de devoción como cambios parciales', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Devoción mariana');
    fireEvent.change(document.getElementById('devocion-titulo')!, { target: { value: 'Devoción a la Virgen' } });
    fireEvent.change(document.getElementById('oracion-texto')!, { target: { value: 'Padre nuestro.\n\nQuédate con nosotros.\n\nAmén.' } });
    await userEvent.click(screen.getByRole('button', { name: 'Agregar tarjeta' }));
    fireEvent.change(document.getElementById('tarjeta-titulo-1')!, { target: { value: 'Salve' } });
    fireEvent.change(document.getElementById('tarjeta-descripcion-1')!, { target: { value: 'Canto del sábado.' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', {
      devocion: {
        titulo: 'Devoción a la Virgen',
        oracion: { texto: 'Padre nuestro.\n\nQuédate con nosotros.\n\nAmén.' },
        tarjetas: [
          { titulo: 'Rosario', descripcion: 'Rezo diario.' },
          { titulo: 'Salve', descripcion: 'Canto del sábado.' },
        ],
      },
    }));
  });

  it('elimina una tarjeta de devoción tras confirmar y publica la lista vacía', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Rosario');
    await userEvent.click(within(screen.getByRole('heading', { name: 'Tarjeta 01' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText(/¿Eliminar la tarjeta «Rosario» de la devoción del borrador\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar tarjeta' }));
    expect(screen.getByText('No hay tarjetas de devoción publicadas.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', { devocion: { tarjetas: [] } }));
  });

  it('permite completar la devoción cuando el contenido publicado todavía no la incluye', async () => {
    const { devocion, ...anterior } = contenido;
    vi.mocked(apiClient.get).mockResolvedValue({ data: anterior });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Una comunidad viva');
    expect(screen.getByText('No hay tarjetas de devoción publicadas.')).toBeInTheDocument();
    const completar = { 'devocion-titulo': 'Devoción', 'devocion-descripcion': 'Introducción', 'oracion-titulo': 'Oración nueva', 'oracion-texto': 'Amén.' };
    Object.entries(completar).forEach(([id, valor]) => fireEvent.change(document.getElementById(id)!, { target: { value: valor } }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', {
      devocion: { titulo: 'Devoción', descripcion: 'Introducción', oracion: { titulo: 'Oración nueva', texto: 'Amén.' } },
    }));
  });

  it('sube la foto de la portada y la de una tarjeta y las publica junto con el contenido', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { url: FOTO_1 } }).mockResolvedValueOnce({ data: { url: FOTO_2 } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Una comunidad viva');
    await userEvent.upload(screen.getByLabelText('Foto principal de la portada'), archivoPng());
    expect(await screen.findByText('Foto nueva: se publicará al guardar los cambios.')).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/api/landing/imagenes', expect.any(FormData));
    await userEvent.upload(screen.getByLabelText('Foto de «Servicio»'), archivoPng());
    await screen.findByRole('button', { name: 'Quitar foto: Foto de «Servicio»' });
    expect(apiClient.patch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', {
      imagenes: { hero: FOTO_1 },
      valores: [{ titulo: 'Servicio', descripcion: 'Acompañamos a todos.', imagen: FOTO_2 }],
    }));
  });

  it('ofrece un espacio de foto en cada sección con fotografías y no en las demás', async () => {
    render(<ContenidoPublicoPage />);
    await screen.findByDisplayValue('Una comunidad viva');

    for (const etiqueta of ['Foto principal de la portada', 'Miembros de la comunidad parroquial', 'Celebración litúrgica', 'Ministros de la parroquia',
      'Foto 1 de nuestra historia', 'Foto 2 de nuestra historia', 'Foto 3 de nuestra historia', 'Foto de la entrada a la parroquia', 'Foto de «Servicio»']) {
      expect(screen.getByLabelText(etiqueta)).toHaveAttribute('type', 'file');
    }
    await userEvent.click(screen.getByRole('button', { name: 'Agregar tarjeta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar fecha' }));
    expect(screen.getByLabelText('Foto de «tarjeta 2»')).toHaveAttribute('type', 'file');
    expect(screen.getByLabelText('Foto de «fecha 1»')).toHaveAttribute('type', 'file');
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(12);
  });

  it('quita una foto subida y publica el regreso a la foto predeterminada', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { ...contenido, imagenes: { hero: FOTO_1 }, valores: [{ titulo: 'Servicio', descripcion: 'Acompañamos a todos.', imagen: FOTO_2 }] } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Una comunidad viva');
    await userEvent.click(screen.getByRole('button', { name: 'Quitar foto: Foto principal de la portada' }));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar foto: Foto de «Servicio»' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/landing', {
      imagenes: { hero: '' },
      valores: [{ titulo: 'Servicio', descripcion: 'Acompañamos a todos.', imagen: '' }],
    }));
  });

  it('muestra el error de la subida y no marca la sección como modificada', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { data: { message: 'La imagen no puede superar 10 MB' } } });
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Una comunidad viva');
    await userEvent.upload(screen.getByLabelText('Foto principal de la portada'), archivoPng());
    expect(await screen.findByText('La imagen no puede superar 10 MB')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No hay cambios pendientes por publicar.');
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('elimina un valor sin título y una hora vacía usando los nombres de respaldo', async () => {
    render(<ContenidoPublicoPage />);
    await screen.findByDisplayValue('Servicio');

    await userEvent.click(screen.getByRole('button', { name: 'Agregar valor' }));
    await userEvent.click(within(screen.getByRole('heading', { name: 'Valor 02' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText(/¿Eliminar el valor «Valor 2» del borrador\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar valor' }));

    await userEvent.click(screen.getByRole('button', { name: '+ Agregar hora' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar hora 3 del horario de misa 1' }));
    expect(screen.getByText(/¿Quitar la hora 3 del horario de misa 1\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar hora' }));
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
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar valor' }));

    cambiar('misa-dias-0', 'Domingo y festivos');
    cambiar('Hora 1 del horario de misa 1', '09:00');
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar hora' }));
    cambiar('Hora 3 del horario de misa 1', '18:00');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar hora 3 del horario de misa 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar hora' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar horario' })[0]);
    cambiar('misa-dias-1', 'Sábado');
    cambiar('Hora 1 del horario de misa 2', '17:00');
    await userEvent.click(within(document.getElementById('misa-dias-1')!.closest('article')!).getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar horario' }));

    cambiar('oficina-dias-0', 'Martes a viernes');
    cambiar('oficina-horario-0', '10:00 – 15:00');
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar horario' })[1]);
    cambiar('oficina-dias-1', 'Sábado');
    cambiar('oficina-horario-1', '09:00 – 12:00');
    await userEvent.click(within(document.getElementById('oficina-dias-1')!.closest('article')!).getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar horario' }));

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
    const dialogo = screen.getByRole('dialog', { name: 'Descartar cambios' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    const dialogo2 = screen.getByRole('dialog', { name: 'Descartar cambios' });
    await userEvent.click(within(dialogo2).getByRole('button', { name: 'Descartar cambios' }));
    expect(await screen.findByDisplayValue('Casa de oración')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No hay cambios pendientes');
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('permite dejar vacías las listas dinámicas', async () => {
    render(<ContenidoPublicoPage />);

    await screen.findByDisplayValue('Una comunidad viva');
    await userEvent.click(within(screen.getByRole('heading', { name: 'Valor 01' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar valor' }));
    await userEvent.click(within(screen.getByRole('heading', { name: 'Horario de misa 1' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar horario' }));
    await userEvent.click(within(screen.getByRole('heading', { name: 'Horario de oficina 1' }).closest('article')!).getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar horario' }));

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

  it('indica que no hay cambios pendientes si se intenta guardar sin modificar', async () => {
    render(<ContenidoPublicoPage />);
    await screen.findByDisplayValue('Casa de oración');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar cambios' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No hay cambios pendientes por publicar.');
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
});
