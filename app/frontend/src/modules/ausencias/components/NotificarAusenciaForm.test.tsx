import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotificarAusenciaForm from './NotificarAusenciaForm';
import { notificarAusencia } from '../../../api/ausencias';
import apiClient from '../../../api/client';
import { AuthProvider } from '../../../context/AuthContext';
import AusenciasPage from '../../../pages/ausencias/AusenciasPage';
import Sidebar from '../../../components/layout/Sidebar';

vi.mock('../../../api/client', () => ({ default: { post: vi.fn() } }));
const payload = { ministro_id: 9, fecha_inicio: '2026-10-01', fecha_fin: '2026-10-05',
  titulo: 'Viaje familiar', justificacion: 'Estaré fuera de la ciudad.' };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('usuario', JSON.stringify({ id: 9, rol_id: 4, nombre: 'Ministro Test' }));
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
});

function mostrar() {
  render(<MemoryRouter><AuthProvider><NotificarAusenciaForm /></AuthProvider></MemoryRouter>);
}
function completar() {
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: payload.fecha_inicio } });
  fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: payload.fecha_fin } });
  fireEvent.change(screen.getByLabelText('Razón de la ausencia'), { target: { value: ` ${payload.titulo} ` } });
  fireEvent.change(screen.getByLabelText('Justificación o descripción'), { target: { value: payload.justificacion } });
}
function enviar() { fireEvent.submit(screen.getByRole('form')); }

describe('Notificar ausencia', () => {
  it('envía la identidad de sesión y campos completos; muestra éxito y limpia el formulario', async () => {
    mostrar(); completar(); enviar();
    await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledWith('/api/ausencias', payload);
    expect(screen.getByLabelText('Razón de la ausencia')).toHaveValue('');
    expect(screen.getByLabelText('Fecha de inicio')).toHaveValue('');
  });

  it('rechaza fechas invertidas antes del POST', () => {
    mostrar(); completar();
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-10-06' } });
    enviar();
    expect(screen.getByRole('alert')).toHaveTextContent('inicio no puede ser posterior');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('permite ausencia de un día', async () => {
    mostrar(); completar();
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: payload.fecha_inicio } });
    enviar(); await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledWith('/api/ausencias', { ...payload, fecha_fin: payload.fecha_inicio });
  });

  it.each(['Fecha de inicio', 'Fecha de fin', 'Razón de la ausencia', 'Justificación o descripción'])(
    'requiere %s antes de enviar', label => {
      mostrar(); completar();
      fireEvent.change(screen.getByLabelText(label), { target: { value: '' } });
      enviar(); expect(apiClient.post).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeInTheDocument();
    });

  it.each(['Razón de la ausencia', 'Justificación o descripción'])('rechaza espacios en %s', label => {
    mostrar(); completar(); fireEvent.change(screen.getByLabelText(label), { target: { value: '   ' } });
    enviar(); expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('conserva datos ante un error y permite reintentar', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('sin conexión'));
    mostrar(); completar(); enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Tus datos se conservaron');
    expect(screen.getByLabelText('Fecha de fin')).toHaveValue(payload.fecha_fin);
    enviar(); await screen.findByRole('status'); expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it('bloquea envíos repetidos durante la solicitud', async () => {
    let terminar!: () => void;
    vi.mocked(apiClient.post).mockImplementationOnce(() => new Promise(resolve => { terminar = () => resolve({ data: {} }); }));
    mostrar(); completar(); enviar(); enviar();
    expect(screen.getByRole('button', { name: 'Enviando notificación…' })).toBeDisabled();
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    terminar(); await screen.findByRole('status');
  });

  it.each([1, 2, 3])('oculta el acceso y redirige el rol %s', async rol_id => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id }));
    render(<MemoryRouter initialEntries={['/ausencias']}><AuthProvider><Sidebar /><Routes>
      <Route path="/ausencias" element={<AusenciasPage />} />
      <Route path="/dashboard" element={<p>Inicio permitido</p>} />
    </Routes></AuthProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Inicio permitido')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: 'Notificar Ausencia' })).not.toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('muestra el acceso al admin y envía su propia identidad', async () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id: 5, nombre: 'Admin' }));
    render(<MemoryRouter><AuthProvider><Sidebar /><AusenciasPage /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Notificar Ausencia' })).toBeInTheDocument();
    completar(); enviar(); await screen.findByRole('status');
    expect(apiClient.post).toHaveBeenCalledWith('/api/ausencias', { ...payload, ministro_id: 1 });
  });

  it('el cliente conserva el contrato del endpoint', async () => {
    await notificarAusencia(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/ausencias', payload);
  });
});
