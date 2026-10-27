import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MensajesContactoPage from './MensajesContactoPage';
import { useAuth } from '../../context/AuthContext';
import { authValue } from '../../test/authValue';
import { listarMensajesContactoApi, type MensajeContacto } from '../../api/contacto';
import { ROLES } from '../../utils/roles';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/contacto', () => ({ listarMensajesContactoApi: vi.fn() }));

const mensaje: MensajeContacto = {
  id: 7, nombre: 'María Guzmán', correo: 'maria@example.com', telefono: '+50255551234',
  motivo: 'Información general', mensaje: 'Quisiera saber los horarios de misa del domingo.',
  fecha: '2026-10-26', creado_en: '2026-10-26T15:30:00.000Z',
};

function renderizar(rol_id: number) {
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Usuario', correo: 'u@parroquia.com', rol_id }));
  return render(<MemoryRouter><MensajesContactoPage /></MemoryRouter>);
}

describe('MensajesContactoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listarMensajesContactoApi).mockResolvedValue([mensaje]);
  });

  it.each([ROLES.SACERDOTE, ROLES.ADMIN])('lista los mensajes para el rol %s y abre el detalle', async (rol) => {
    renderizar(rol);

    expect(await screen.findByText('María Guzmán')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver mensaje' }));
    const dialogo = within(screen.getByRole('dialog'));
    expect(dialogo.getByText(mensaje.mensaje)).toBeInTheDocument();
    expect(dialogo.getByText('+50255551234')).toBeInTheDocument();
  });

  it('muestra un estado vacío sin mensajes', async () => {
    vi.mocked(listarMensajesContactoApi).mockResolvedValue([]);
    renderizar(ROLES.ADMIN);
    expect(await screen.findByText('Aún no se han recibido mensajes de contacto.')).toBeInTheDocument();
  });

  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS])(
    'no consulta ni muestra mensajes al rol %s',
    (rol) => {
      renderizar(rol);
      expect(listarMensajesContactoApi).not.toHaveBeenCalled();
      expect(screen.queryByText('Mensajes de contacto')).not.toBeInTheDocument();
    }
  );
});
