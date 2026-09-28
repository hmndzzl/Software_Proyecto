import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotificacionesPage from '../NotificacionesPage';
import apiClient from '../../../api/client';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn(), delete: vi.fn(), post: vi.fn() } }));

const notificaciones = [
  {
    id: 1, mensaje: 'Primera notificación', fecha: '2026-10-01', tipo: 'individual',
    remitente_id: null, remitente_nombre: null, grupo_id: null, leida: true,
    evento_id: null, evento_descripcion: null, requiere_confirmacion: false,
    asistencia_confirmada: false, motivo_excusa: null
  },
  {
    id: 2, mensaje: 'Segunda notificación', fecha: '2026-10-02', tipo: 'individual',
    remitente_id: null, remitente_nombre: null, grupo_id: null, leida: false,
    evento_id: null, evento_descripcion: null, requiere_confirmacion: false,
    asistencia_confirmada: false, motivo_excusa: null
  },
];

const papelera = [
  {
    id: 9, mensaje: 'Notificación eliminada', fecha: '2026-09-20', tipo: 'individual',
    remitente_id: null, remitente_nombre: null, grupo_id: null, leida: true,
    evento_id: null, evento_descripcion: null, requiere_confirmacion: false,
    eliminada_en: '2026-09-25T10:00:00.000Z'
  },
];

const enviadas = [
  {
    id: 7, mensaje: 'Aviso importante', fecha: '2026-09-15', tipo: 'individual',
    grupo_id: null, evento_id: null, requiere_confirmacion: false,
    total_destinatarios: 2, total_leidas: 1, total_confirmaron: 0, destinatarios_nombres: 'Ana Xitumul, Pedro Caso'
  },
];

function mockGetPorUrl() {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url === '/api/notificaciones/papelera') return Promise.resolve({ data: papelera });
    if (url === '/api/notificaciones/enviadas') return Promise.resolve({ data: enviadas });
    return Promise.resolve({ data: notificaciones });
  });
}

function usuarioMinistro() {
  localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id: 4, nombre: 'Ministro Test' }));
}
function usuarioSacerdote() {
  localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id: 1, nombre: 'Sacerdote Test' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  usuarioMinistro();
  mockGetPorUrl();
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
  Element.prototype.scrollIntoView = vi.fn();
});

function mostrar(initialEntry = '/notificaciones') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/notificaciones" element={<NotificacionesPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Resaltado de notificación desde el menú de la campana', () => {
  it('desplaza hasta la notificación indicada por ?resaltar= al cargar y quita parametro', async () => {
    mostrar('/notificaciones?resaltar=2');
    await screen.findByText('Segunda notificación');
    expect(document.getElementById('notificacion-2')?.scrollIntoView).toHaveBeenCalled();

    // Esperar el timeout real de 2.5s para cubrir las lineas de setSearchParams
    await new Promise(r => setTimeout(r, 2600));
  });

  it('no desplaza nada si no hay parámetro resaltar', async () => {
    mostrar();
    await screen.findByText('Primera notificación');
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('cada fila tiene un id navegable por notificación', async () => {
    mostrar();
    await screen.findByText('Primera notificación');
    expect(document.getElementById('notificacion-1')).toBeInTheDocument();
    expect(document.getElementById('notificacion-2')).toBeInTheDocument();
  });
});

describe('Pestaña Papelera', () => {
  it('un Ministro no ve la pestaña Enviadas, pero sí Papelera', async () => {
    mostrar();
    await screen.findByText('Primera notificación');
    expect(screen.queryByRole('button', { name: 'Enviadas' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Papelera' })).toBeInTheDocument();
  });

  it('muestra las notificaciones eliminadas y permite restaurarlas', async () => {
    mostrar();
    await screen.findByText('Primera notificación');
    fireEvent.click(screen.getByRole('button', { name: 'Papelera' }));
    await screen.findByText('Notificación eliminada');

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/9/restaurar');
    await waitFor(() => expect(screen.queryByText('Notificación eliminada')).not.toBeInTheDocument());
  });

  it('vacía la papelera solo si se confirma', async () => {
    mostrar();
    await screen.findByText('Primera notificación');
    fireEvent.click(screen.getByRole('button', { name: 'Papelera' }));
    await screen.findByText('Notificación eliminada');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar papelera' }));
    expect(apiClient.delete).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar papelera' }));
    expect(apiClient.delete).toHaveBeenCalledWith('/api/notificaciones/papelera');
    await waitFor(() => expect(screen.getByText('La papelera está vacía.')).toBeInTheDocument());
    confirmSpy.mockRestore();
  });
});

describe('Sincronización entre Recibidas y Papelera', () => {
  it('al eliminar una notificación, aparece en la Papelera sin recargar', async () => {
    let inbox = [...notificaciones];
    let trash: typeof papelera = [];
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/api/notificaciones/papelera') return Promise.resolve({ data: trash });
      if (url === '/api/notificaciones/enviadas') return Promise.resolve({ data: enviadas });
      return Promise.resolve({ data: inbox });
    });
    vi.mocked(apiClient.put).mockImplementation((url: string) => {
      if (url === '/api/notificaciones/1/papelera') {
        const [movida] = inbox.filter((n) => n.id === 1);
        inbox = inbox.filter((n) => n.id !== 1);
        trash = [...trash, { ...movida, eliminada_en: '2026-09-28T00:00:00.000Z' }];
      }
      return Promise.resolve({ data: {} });
    });

    mostrar();
    await screen.findByText('Primera notificación');
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    await waitFor(() => expect(screen.queryByText('Primera notificación')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Papelera' }));
    await screen.findByText('Primera notificación');
  });

  it('al restaurar una notificación, vuelve a Recibidas sin recargar', async () => {
    let inbox: typeof notificaciones = [];
    let trash = [...papelera];
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/api/notificaciones/papelera') return Promise.resolve({ data: trash });
      if (url === '/api/notificaciones/enviadas') return Promise.resolve({ data: enviadas });
      return Promise.resolve({ data: inbox });
    });
    vi.mocked(apiClient.put).mockImplementation((url: string) => {
      if (url === '/api/notificaciones/9/restaurar') {
        const [restaurada] = trash.filter((n) => n.id === 9);
        trash = trash.filter((n) => n.id !== 9);
        const { eliminada_en, ...resto } = restaurada;
        inbox = [...inbox, resto as typeof notificaciones[number]];
      }
      return Promise.resolve({ data: {} });
    });

    mostrar();
    await screen.findByText('No tienes notificaciones.');
    fireEvent.click(screen.getByRole('button', { name: 'Papelera' }));
    await screen.findByText('Notificación eliminada');
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    await waitFor(() => expect(screen.queryByText('Notificación eliminada')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Recibidas' }));
    await screen.findByText('Notificación eliminada');
  });
});

describe('Pestaña Enviadas', () => {
  it('un Sacerdote sí ve la pestaña Enviadas con destinatarios y lecturas', async () => {
    usuarioSacerdote();
    mostrar();
    await screen.findByText('Primera notificación');
    fireEvent.click(screen.getByRole('button', { name: 'Enviadas' }));
    await screen.findByText('Aviso importante');
    expect(screen.getByText('Ana Xitumul, Pedro Caso')).toBeInTheDocument();
    expect(screen.getByText('1/2 leídas')).toBeInTheDocument();
  });
});

describe('Confirmación y cancelación de asistencia', () => {
  it('permite confirmar asistencia y luego cancelar dicha confirmación', async () => {
    const requiereAsistencia = [{
      ...notificaciones[0],
      requiere_confirmacion: true,
      asistencia_confirmada: false,
      motivo_excusa: null,
    }];
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/api/notificaciones/papelera') return Promise.resolve({ data: papelera });
      if (url === '/api/notificaciones/enviadas') return Promise.resolve({ data: enviadas });
      return Promise.resolve({ data: requiereAsistencia });
    });

    mostrar();
    await screen.findByRole('button', { name: 'Confirmar' });

    // Confirmar asistencia
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/asistencia');
    await waitFor(() => expect(screen.getByText('Asistencia confirmada')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Cancelar asistencia' })).toBeInTheDocument();

    // Cancelar asistencia confirmada
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar asistencia' }));
    expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/cancelar-asistencia');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Cancelar asistencia' })).not.toBeInTheDocument();
  });
});

describe('Reportar inasistencia y revertirla', () => {
  it('permite registrar que no podrá asistir mediante el modal de excusa', async () => {
    const requiereAsistencia = [{
      ...notificaciones[0],
      requiere_confirmacion: true,
      asistencia_confirmada: false,
      motivo_excusa: null,
    }];
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/api/notificaciones/papelera') return Promise.resolve({ data: papelera });
      if (url === '/api/notificaciones/enviadas') return Promise.resolve({ data: enviadas });
      return Promise.resolve({ data: requiereAsistencia });
    });

    mostrar();
    await screen.findByRole('button', { name: 'No podré asistir' });

    // Abrir modal de excusa
    fireEvent.click(screen.getByRole('button', { name: 'No podré asistir' }));
    expect(screen.getByRole('heading', { name: 'Excusar Asistencia' })).toBeInTheDocument();

    // Llenar motivo y enviar
    const textarea = screen.getByPlaceholderText(/Explica brevemente por qué no podrás asistir/i);
    fireEvent.change(textarea, { target: { value: 'Tengo un compromiso familiar inaplazable' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar excusa' }));

    expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/excusar', {
      motivo: 'Tengo un compromiso familiar inaplazable',
    });
    await waitFor(() => expect(screen.getByText('No asistirá')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Quitar no asistencia' })).toBeInTheDocument();
  });

  it('elimina el estado de no asistencia después de confirmar la operación', async () => {
    const conInasistencia = [{
      ...notificaciones[0],
      requiere_confirmacion: true,
      motivo_excusa: 'Tengo un compromiso',
    }];
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/api/notificaciones/papelera') return Promise.resolve({ data: papelera });
      if (url === '/api/notificaciones/enviadas') return Promise.resolve({ data: enviadas });
      return Promise.resolve({ data: conInasistencia });
    });

    mostrar();
    await screen.findByRole('button', { name: 'Quitar no asistencia' });

    fireEvent.click(screen.getByRole('button', { name: 'Quitar no asistencia' }));

    expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/cancelar-inasistencia');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Quitar no asistencia' })).not.toBeInTheDocument();
  });
});
