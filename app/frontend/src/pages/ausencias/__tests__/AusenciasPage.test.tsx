import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AusenciasPage from '../AusenciasPage';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import { ROLES } from '../../../utils/roles';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the child component so we don't have to test its API requests here
vi.mock('../../../modules/ausencias/components/NotificarAusenciaForm', () => ({
  default: () => <div data-testid="notificar-ausencia-form">Formulario Mock</div>,
}));

describe('AusenciasPage', () => {
  const renderConRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/ausencias']}>
        <Routes>
          <Route path="/ausencias" element={<AusenciasPage />} />
          <Route path="/dashboard" element={<div>Dashboard Mock</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('redirige al dashboard si el usuario no es ministro', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, rol_id: ROLES.SACERDOTE, nombre: 'Sacerdote Test', correo: 'sacerdote@test.com' }));

    renderConRouter();

    expect(screen.getByText('Dashboard Mock')).toBeInTheDocument();
    expect(screen.queryByText('Notificar ausencia')).not.toBeInTheDocument();
  });

  it('renderiza la página para un ministro', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 9, rol_id: ROLES.MINISTRO, nombre: 'Ministro Test', correo: 'ministro@test.com' }));

    renderConRouter();

    expect(screen.getByText('Notificar ausencia')).toBeInTheDocument();
    expect(screen.getByText('Nuevo periodo de ausencia')).toBeInTheDocument();
    expect(screen.getByTestId('notificar-ausencia-form')).toBeInTheDocument();
  });
});
