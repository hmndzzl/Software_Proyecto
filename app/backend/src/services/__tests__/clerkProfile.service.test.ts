import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sincronizarPerfilEnClerk } from '../clerkProfile.service';
import { HttpStatus } from '../../utils/httpStatus';

const clerk = vi.hoisted(() => ({
  users: { getUser: vi.fn(), updateUser: vi.fn() },
  emailAddresses: { createEmailAddress: vi.fn(), updateEmailAddress: vi.fn(), deleteEmailAddress: vi.fn() },
}));
vi.mock('../../config/clerk', () => ({ getClerkClient: () => clerk }));

const correo = (id: string, emailAddress: string, status = 'verified') => ({ id, emailAddress, verification: { status } });

describe('sincronizarPerfilEnClerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    clerk.users.getUser.mockResolvedValue({ emailAddresses: [correo('idn_viejo', 'viejo@parroquia.com')] });
    clerk.users.updateUser.mockResolvedValue({});
    clerk.emailAddresses.createEmailAddress.mockResolvedValue({ id: 'idn_nuevo' });
    clerk.emailAddresses.updateEmailAddress.mockResolvedValue({});
    clerk.emailAddresses.deleteEmailAddress.mockResolvedValue({});
  });

  it('solo contraseña: actualiza el usuario y no toca los correos', async () => {
    const error = await sincronizarPerfilEnClerk('user_1', { password: 'Clave-Segura-1', correoAnterior: 'viejo@parroquia.com' });

    expect(error).toBeNull();
    expect(clerk.users.updateUser).toHaveBeenCalledWith('user_1', { password: 'Clave-Segura-1' });
    expect(clerk.users.getUser).not.toHaveBeenCalled();
    expect(clerk.emailAddresses.createEmailAddress).not.toHaveBeenCalled();
  });

  it('correo nuevo: lo agrega verificado, lo pone principal y retira el anterior', async () => {
    const error = await sincronizarPerfilEnClerk('user_1', {
      correoNuevo: 'nuevo@parroquia.com',
      correoAnterior: 'viejo@parroquia.com',
    });

    expect(error).toBeNull();
    expect(clerk.emailAddresses.createEmailAddress).toHaveBeenCalledWith({
      userId: 'user_1',
      emailAddress: 'nuevo@parroquia.com',
      verified: true,
    });
    expect(clerk.users.updateUser).toHaveBeenCalledWith('user_1', { primaryEmailAddressID: 'idn_nuevo' });
    expect(clerk.emailAddresses.deleteEmailAddress).toHaveBeenCalledWith('idn_viejo');
  });

  it('correo y contraseña juntos: una sola llamada para ambos', async () => {
    await sincronizarPerfilEnClerk('user_1', {
      correoNuevo: 'nuevo@parroquia.com',
      correoAnterior: 'viejo@parroquia.com',
      password: 'Clave-Segura-1',
    });

    expect(clerk.users.updateUser).toHaveBeenCalledTimes(1);
    expect(clerk.users.updateUser).toHaveBeenCalledWith('user_1', {
      primaryEmailAddressID: 'idn_nuevo',
      password: 'Clave-Segura-1',
    });
  });

  it('reutiliza un correo que la persona ya tiene en Clerk, sin volver a crearlo', async () => {
    clerk.users.getUser.mockResolvedValue({
      emailAddresses: [correo('idn_viejo', 'viejo@parroquia.com'), correo('idn_otro', 'Nuevo@Parroquia.com', 'unverified')],
    });

    await sincronizarPerfilEnClerk('user_1', { correoNuevo: 'nuevo@parroquia.com', correoAnterior: 'viejo@parroquia.com' });

    expect(clerk.emailAddresses.createEmailAddress).not.toHaveBeenCalled();
    expect(clerk.emailAddresses.updateEmailAddress).toHaveBeenCalledWith('idn_otro', { verified: true });
    expect(clerk.users.updateUser).toHaveBeenCalledWith('user_1', { primaryEmailAddressID: 'idn_otro' });
  });

  it('correo ya usado por otra cuenta de Clerk: 409 y nada que deshacer', async () => {
    clerk.emailAddresses.createEmailAddress.mockRejectedValue({
      status: 422,
      errors: [{ code: 'form_identifier_exists', longMessage: 'That email address is taken.' }],
    });

    const error = await sincronizarPerfilEnClerk('user_1', { correoNuevo: 'ocupado@parroquia.com', correoAnterior: 'viejo@parroquia.com' });

    expect(error).toEqual({ status: HttpStatus.CONFLICT, mensaje: 'El correo ya está en uso por otra persona' });
    expect(clerk.users.updateUser).not.toHaveBeenCalled();
    expect(clerk.emailAddresses.deleteEmailAddress).not.toHaveBeenCalled();
  });

  it('si Clerk rechaza la contraseña, deshace el correo recién agregado y no retira el anterior', async () => {
    clerk.users.updateUser.mockRejectedValue({ status: 422, errors: [{ code: 'form_password_pwned', longMessage: 'Contraseña filtrada.' }] });

    const error = await sincronizarPerfilEnClerk('user_1', {
      correoNuevo: 'nuevo@parroquia.com',
      correoAnterior: 'viejo@parroquia.com',
      password: '12345678',
    });

    expect(error).toEqual({ status: HttpStatus.BAD_REQUEST, mensaje: 'Contraseña filtrada.' });
    expect(clerk.emailAddresses.deleteEmailAddress).toHaveBeenCalledTimes(1);
    expect(clerk.emailAddresses.deleteEmailAddress).toHaveBeenCalledWith('idn_nuevo');
  });

  it('no deshace un correo que ya existía antes si falla el paso siguiente', async () => {
    clerk.users.getUser.mockResolvedValue({
      emailAddresses: [correo('idn_viejo', 'viejo@parroquia.com'), correo('idn_otro', 'nuevo@parroquia.com')],
    });
    clerk.users.updateUser.mockRejectedValue(new Error('timeout'));

    await sincronizarPerfilEnClerk('user_1', { correoNuevo: 'nuevo@parroquia.com', correoAnterior: 'viejo@parroquia.com' });

    expect(clerk.emailAddresses.deleteEmailAddress).not.toHaveBeenCalled();
  });

  it('502 si Clerk no responde', async () => {
    clerk.users.getUser.mockRejectedValue(new Error('timeout'));

    const error = await sincronizarPerfilEnClerk('user_1', { correoNuevo: 'nuevo@parroquia.com', correoAnterior: 'viejo@parroquia.com' });

    expect(error?.status).toBe(HttpStatus.BAD_GATEWAY);
  });

  it('si no logra retirar el correo anterior, igual da el cambio por bueno', async () => {
    clerk.emailAddresses.deleteEmailAddress.mockRejectedValue(new Error('falló'));

    const error = await sincronizarPerfilEnClerk('user_1', { correoNuevo: 'nuevo@parroquia.com', correoAnterior: 'viejo@parroquia.com' });

    expect(error).toBeNull();
  });
});
