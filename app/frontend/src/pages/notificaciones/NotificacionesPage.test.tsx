import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotificacionesPage from './NotificacionesPage';
import apiClient from '../../api/client';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn() } }));

const notificaciones = [
  { id: 1, mensaje: 'Primera notificación', fecha: '2026-10-01', tipo: 'individual',
    remitente_id: null, remitente_nombre: null, grupo_id: null, leida: true,
    evento_id: null, evento_descripcion: null, requiere_confirmacion: false,
    asistencia_confirmada: false, motivo_excusa: null },
  { id: 2, mensaje: 'Segunda notificación', fecha: '2026-10-02', tipo: 'individual',
    remitente_id: null, remitente_nombre: null, grupo_id: null, leida: false,
    evento_id: null, evento_descripcion: null, requiere_confirmacion: false,
    asistencia_confirmada: false, motivo_excusa: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id: 4, nombre: 'Ministro Test' }));
  vi.mocked(apiClient.get).mockResolvedValue({ data: notificaciones });
  Element.prototype.scrollIntoView = vi.fn();
});

function mostrar(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/notificaciones" element={<NotificacionesPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Resaltado de notificación desde el menú de la campana', () => {
  it('desplaza hasta la notificación indicada por ?resaltar= al cargar', async () => {
    mostrar('/notificaciones?resaltar=2');
    await screen.findByText('Segunda notificación');
    expect(document.getElementById('notificacion-2')?.scrollIntoView).toHaveBeenCalled();
  });

  it('no desplaza nada si no hay parámetro resaltar', async () => {
    mostrar('/notificaciones');
    await screen.findByText('Primera notificación');
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('cada fila tiene un id navegable por notificación', async () => {
    mostrar('/notificaciones');
    await screen.findByText('Primera notificación');
    expect(document.getElementById('notificacion-1')).toBeInTheDocument();
    expect(document.getElementById('notificacion-2')).toBeInTheDocument();
  });
});
