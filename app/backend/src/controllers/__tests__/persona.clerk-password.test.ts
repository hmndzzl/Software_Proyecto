import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../../config/db';
import { isClerkEnabled } from '../../config/clerk';
import { HttpStatus } from '../../utils/httpStatus';
import { ROLES } from '../../config/roles';
import { editarPerfil } from '../persona.controller';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn() } }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }));

const { updateUser, getUser, createEmailAddress, deleteEmailAddress } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  getUser: vi.fn(),
  createEmailAddress: vi.fn(),
  deleteEmailAddress: vi.fn(),
}));
vi.mock('../../config/clerk', () => ({
  isClerkEnabled: vi.fn(),
  getClerkClient: vi.fn(() => ({
    users: { updateUser, getUser },
    emailAddresses: { createEmailAddress, deleteEmailAddress, updateEmailAddress: vi.fn() },
  })),
}));

describe('editarPerfil - sincronización de la contraseña con Clerk', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;

  const personaExistente = (clerkUserId: string | null) =>
    (pool.execute as any).mockResolvedValueOnce([[{ id: 4, nombre: 'Ana', correo: 'ana@test.com', rol_id: ROLES.MINISTRO, clerk_user_id: clerkUserId }]]);

  const actualizacionExitosa = () => {
    (pool.execute as any)
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 4, nombre: 'Ana' }]]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    res = { status: statusMock, json: jsonMock };
    req = { user: { id: 4, rol_id: ROLES.MINISTRO }, params: { id: '4' }, body: { password: 'NuevaClave-2026' } };
    (isClerkEnabled as any).mockReturnValue(true);
    (bcrypt.hash as any).mockResolvedValue('hash_nuevo');
  });

  it('cambia la contraseña en Clerk y en la BD', async () => {
    personaExistente('user_abc');
    actualizacionExitosa();
    updateUser.mockResolvedValue({});

    await editarPerfil(req as Request, res as Response);

    expect(updateUser).toHaveBeenCalledWith('user_abc', { password: 'NuevaClave-2026' });
    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE persona SET password = ?'),
      ['hash_nuevo', 4]
    );
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('un Admin que cambia la contraseña de otra persona también actualiza su usuario de Clerk', async () => {
    req.user = { id: 1, rol_id: ROLES.ADMIN };
    personaExistente('user_abc');
    actualizacionExitosa();
    updateUser.mockResolvedValue({});

    await editarPerfil(req as Request, res as Response);

    expect(updateUser).toHaveBeenCalledWith('user_abc', { password: 'NuevaClave-2026' });
  });

  it('no toca Clerk si la persona no está vinculada', async () => {
    personaExistente(null);
    actualizacionExitosa();

    await editarPerfil(req as Request, res as Response);

    expect(updateUser).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('no toca Clerk si Clerk no está configurado', async () => {
    (isClerkEnabled as any).mockReturnValue(false);
    personaExistente('user_abc');
    actualizacionExitosa();

    await editarPerfil(req as Request, res as Response);

    expect(updateUser).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('no toca Clerk si no se cambia la contraseña', async () => {
    req.body = { nombre: 'Ana María' };
    personaExistente('user_abc');
    actualizacionExitosa();

    await editarPerfil(req as Request, res as Response);

    expect(updateUser).not.toHaveBeenCalled();
  });

  it('retorna 400 con el motivo de Clerk si rechaza la contraseña, sin cambiar la BD', async () => {
    personaExistente('user_abc');
    updateUser.mockRejectedValue({ status: 422, errors: [{ longMessage: 'Esta contraseña apareció en una filtración de datos.' }] });

    await editarPerfil(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Esta contraseña apareció en una filtración de datos.' });
    expect(pool.execute).toHaveBeenCalledTimes(1); // solo el SELECT inicial
  });

  describe('cambio de correo', () => {
    beforeEach(() => {
      req.body = { correo: 'nuevo@test.com' };
      getUser.mockResolvedValue({ emailAddresses: [{ id: 'idn_viejo', emailAddress: 'ana@test.com', verification: { status: 'verified' } }] });
      createEmailAddress.mockResolvedValue({ id: 'idn_nuevo' });
      updateUser.mockResolvedValue({});
      deleteEmailAddress.mockResolvedValue({});
    });

    it('cambia el correo en Clerk y en la BD', async () => {
      personaExistente('user_abc');
      (pool.execute as any).mockResolvedValueOnce([[]]); // correo no usado por otra persona
      actualizacionExitosa();

      await editarPerfil(req as Request, res as Response);

      expect(createEmailAddress).toHaveBeenCalledWith({ userId: 'user_abc', emailAddress: 'nuevo@test.com', verified: true });
      expect(updateUser).toHaveBeenCalledWith('user_abc', { primaryEmailAddressID: 'idn_nuevo' });
      expect(deleteEmailAddress).toHaveBeenCalledWith('idn_viejo');
      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE persona SET correo = ?'), ['nuevo@test.com', 4]);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('si el correo solo cambia de mayúsculas no toca Clerk', async () => {
      req.body = { correo: 'ANA@test.com' };
      personaExistente('user_abc');
      (pool.execute as any).mockResolvedValueOnce([[]]);
      actualizacionExitosa();

      await editarPerfil(req as Request, res as Response);

      expect(getUser).not.toHaveBeenCalled();
      expect(createEmailAddress).not.toHaveBeenCalled();
    });

    it('retorna 409 si Clerk ya tiene ese correo en otra cuenta, sin cambiar la BD', async () => {
      personaExistente('user_abc');
      (pool.execute as any).mockResolvedValueOnce([[]]);
      createEmailAddress.mockRejectedValue({ status: 422, errors: [{ code: 'form_identifier_exists' }] });

      await editarPerfil(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(pool.execute).toHaveBeenCalledTimes(2); // SELECT persona + SELECT correo en uso
    });

    it('no toca Clerk si la persona no está vinculada', async () => {
      personaExistente(null);
      (pool.execute as any).mockResolvedValueOnce([[]]);
      actualizacionExitosa();

      await editarPerfil(req as Request, res as Response);

      expect(getUser).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });

  it('retorna 502 si Clerk no responde, sin cambiar la BD', async () => {
    personaExistente('user_abc');
    updateUser.mockRejectedValue(new Error('timeout'));

    await editarPerfil(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });
});
